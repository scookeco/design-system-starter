/**
 * The document expression language: the `when` of a Conditional and the `formula` of a Computed.
 * Deliberately small, and parsed, never evaluated as code:
 *
 *   names and dot-paths   multiple_jobs   items.amount   (a path through rows gives a list)
 *   literals              12   0.5   'executed'   "x"   true   false   null
 *   comparison            ==  !=  <  <=  >  >=
 *   logic                 and  or  not
 *   arithmetic            +  -  *  /   unary -   ( … )
 *   aggregates            sum(list)  count(list)  min(list)  max(list)
 *
 * No user-defined functions and no side effects. The same parser serves the live document and the
 * validator, so an expression that doesn't parse fails the build, not the reader.
 */

export type Value = number | string | boolean | null | readonly Value[];

export type Expression =
  | { kind: 'literal'; value: Value }
  | { kind: 'name'; path: readonly string[] }
  | { kind: 'unary'; op: '-' | 'not'; operand: Expression }
  | { kind: 'binary'; op: BinaryOp; left: Expression; right: Expression }
  | { kind: 'call'; fn: Aggregate; arg: Expression };

type BinaryOp = 'or' | 'and' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '+' | '-' | '*' | '/';
export type Aggregate = 'sum' | 'count' | 'min' | 'max';
const AGGREGATES = new Set<string>(['sum', 'count', 'min', 'max']);

export class ExpressionError extends Error {
  constructor(message: string, readonly source: string) {
    super(`${message} in "${source}"`);
    this.name = 'ExpressionError';
  }
}

type Token = { type: 'number'; value: number } | { type: 'string'; value: string } | { type: 'word'; value: string } | { type: 'op'; value: string };

const OPERATORS = ['==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '(', ')', ','];

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i] ?? '';
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const match = /^[0-9]*\.?[0-9]+/.exec(source.slice(i))?.[0] ?? '';
      tokens.push({ type: 'number', value: Number(match) });
      i += match.length;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = source.indexOf(c, i + 1);
      if (end === -1) throw new ExpressionError('Unclosed string', source);
      tokens.push({ type: 'string', value: source.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*/.exec(source.slice(i))?.[0] ?? '';
      tokens.push({ type: 'word', value: match });
      i += match.length;
      continue;
    }
    const op = OPERATORS.find((o) => source.startsWith(o, i));
    if (!op) throw new ExpressionError(`Unexpected "${c}"`, source);
    tokens.push({ type: 'op', value: op });
    i += op.length;
  }
  return tokens;
}

/** Binding power of each binary operator: higher binds tighter. */
const POWER: Record<BinaryOp, number> = { or: 1, and: 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6 };

const cache = new Map<string, Expression>();

/** Parses an expression. Throws ExpressionError when it isn't one. */
export function parse(source: string): Expression {
  const hit = cache.get(source);
  if (hit) return hit;
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at];
  const binaryOp = (t: Token | undefined): BinaryOp | null => {
    if (!t) return null;
    if (t.type === 'op' && t.value in POWER) return t.value as BinaryOp;
    if (t.type === 'word' && (t.value === 'and' || t.value === 'or')) return t.value;
    return null;
  };
  const expect = (value: string) => {
    const t = tokens[at];
    if (!t || t.type !== 'op' || t.value !== value) throw new ExpressionError(`Expected "${value}"`, source);
    at += 1;
  };

  const primary = (): Expression => {
    const t = tokens[at];
    if (!t) throw new ExpressionError('Unexpected end', source);
    at += 1;
    if (t.type === 'number' || t.type === 'string') return { kind: 'literal', value: t.value };
    if (t.type === 'op' && t.value === '(') {
      const inner = expression(0);
      expect(')');
      return inner;
    }
    if (t.type === 'op' && t.value === '-') return { kind: 'unary', op: '-', operand: expression(7) };
    if (t.type === 'word') {
      if (t.value === 'not') return { kind: 'unary', op: 'not', operand: expression(2) };
      if (t.value === 'true' || t.value === 'false') return { kind: 'literal', value: t.value === 'true' };
      if (t.value === 'null') return { kind: 'literal', value: null };
      const next = tokens[at];
      if (next?.type === 'op' && next.value === '(') {
        if (!AGGREGATES.has(t.value)) throw new ExpressionError(`Unknown function "${t.value}"`, source);
        at += 1;
        const arg = expression(0);
        expect(')');
        return { kind: 'call', fn: t.value as Aggregate, arg };
      }
      if (t.value === 'and' || t.value === 'or') throw new ExpressionError(`Unexpected "${t.value}"`, source);
      return { kind: 'name', path: t.value.split('.') };
    }
    throw new ExpressionError(`Unexpected "${String(t.value)}"`, source);
  };

  const expression = (minPower: number): Expression => {
    let left = primary();
    for (let op = binaryOp(peek()); op && POWER[op] > minPower; op = binaryOp(peek())) {
      at += 1;
      left = { kind: 'binary', op, left, right: expression(POWER[op]) };
    }
    return left;
  };

  const tree = expression(0);
  if (at < tokens.length) throw new ExpressionError(`Unexpected "${String(tokens[at]?.value)}"`, source);
  cache.set(source, tree);
  return tree;
}

/** The names an expression reads, as dot-paths ("multiple_jobs", "items.amount"). */
export function dependencies(tree: Expression): string[] {
  switch (tree.kind) {
    case 'literal':
      return [];
    case 'name':
      return [tree.path.join('.')];
    case 'unary':
      return dependencies(tree.operand);
    case 'call':
      return dependencies(tree.arg);
    case 'binary':
      return [...dependencies(tree.left), ...dependencies(tree.right)];
  }
}

/** Reads a dot-path; the scope decides what a name means (a field, a computed value, a row). */
export type Lookup = (path: readonly string[]) => Value;

const numeric = (v: Value): number => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0);
const list = (v: Value): readonly Value[] => (Array.isArray(v) ? (v as readonly Value[]) : v === null ? [] : [v]);
const truthy = (v: Value): boolean => (Array.isArray(v) ? v.length > 0 : Boolean(v));
const same = (a: Value, b: Value) => (typeof a === 'number' || typeof b === 'number' ? numeric(a) === numeric(b) && a !== null && b !== null : a === b);

/** Evaluates a parsed expression against a lookup. Missing names are null; arithmetic treats them as 0. */
export function evaluate(tree: Expression, lookup: Lookup): Value {
  switch (tree.kind) {
    case 'literal':
      return tree.value;
    case 'name':
      return lookup(tree.path);
    case 'unary': {
      const v = evaluate(tree.operand, lookup);
      return tree.op === 'not' ? !truthy(v) : -numeric(v);
    }
    case 'call': {
      const values = list(evaluate(tree.arg, lookup));
      if (tree.fn === 'count') return values.filter((v) => v !== null && v !== '').length;
      const numbers = values.filter((v) => v !== null && v !== '').map(numeric);
      if (tree.fn === 'sum') return numbers.reduce((a, b) => a + b, 0);
      if (!numbers.length) return null;
      return tree.fn === 'min' ? Math.min(...numbers) : Math.max(...numbers);
    }
    case 'binary': {
      if (tree.op === 'and') return truthy(evaluate(tree.left, lookup)) && truthy(evaluate(tree.right, lookup));
      if (tree.op === 'or') return truthy(evaluate(tree.left, lookup)) || truthy(evaluate(tree.right, lookup));
      const a = evaluate(tree.left, lookup);
      const b = evaluate(tree.right, lookup);
      switch (tree.op) {
        case '==':
          return same(a, b);
        case '!=':
          return !same(a, b);
        case '<':
          return numeric(a) < numeric(b);
        case '<=':
          return numeric(a) <= numeric(b);
        case '>':
          return numeric(a) > numeric(b);
        case '>=':
          return numeric(a) >= numeric(b);
        case '+':
          return numeric(a) + numeric(b);
        case '-':
          return numeric(a) - numeric(b);
        case '*':
          return numeric(a) * numeric(b);
        case '/':
          return numeric(b) === 0 ? null : numeric(a) / numeric(b);
      }
    }
  }
}

/** Is it true? For a Conditional's `when`. */
export const holds = (source: string, lookup: Lookup) => truthy(evaluate(parse(source), lookup));
