import { describe, expect, it } from 'vitest';
import { dependencies, evaluateExpression, ExpressionError, holds, parseExpression, type Value } from '../../src/components/DocumentRuntime/expression';

const scope =
  (data: Record<string, Value>) =>
  (path: readonly string[]): Value => {
    let at: Value = data as unknown as Value;
    for (const key of path) {
      if (Array.isArray(at)) at = (at as Value[]).map((row) => ((row as unknown as Record<string, Value>)[key] ?? null));
      else at = at !== null && typeof at === 'object' ? ((at as unknown as Record<string, Value>)[key] ?? null) : null;
    }
    return at;
  };

const run = (source: string, data: Record<string, Value> = {}) => evaluateExpression(parseExpression(source), scope(data));

describe('document expressions', () => {
  it('does arithmetic with the usual precedence', () => {
    expect(run('2 + 3 * 4')).toBe(14);
    expect(run('(2 + 3) * 4')).toBe(20);
    expect(run('-qty * 2', { qty: 3 })).toBe(-6);
    expect(run('qty * unit_price', { qty: 3, unit_price: 1250 })).toBe(3750);
    expect(run('subtotal * 0.085', { subtotal: 1000 })).toBe(85);
    expect(run('1 / 0')).toBeNull();
  });

  it('compares and combines', () => {
    expect(run('multiple_jobs == true', { multiple_jobs: true })).toBe(true);
    expect(run("lifecycle != 'executed'", { lifecycle: 'negotiated' })).toBe(true);
    expect(run('a > 1 and b < 2 or c', { a: 2, b: 1, c: false })).toBe(true);
    expect(run('not a == b', { a: 1, b: 1 })).toBe(false);
    expect(run('not done', {})).toBe(true);
  });

  it('aggregates a list, from a path through rows', () => {
    const data = { items: [{ amount: 100 }, { amount: 250 }, { amount: null }] } as unknown as Record<string, Value>;
    expect(run('sum(items.amount)', data)).toBe(350);
    expect(run('count(items.amount)', data)).toBe(2);
    expect(run('min(items.amount)', data)).toBe(100);
    expect(run('max(items.amount)', data)).toBe(250);
    expect(run('max(items.missing)', data)).toBeNull();
  });

  it('treats a missing name as null, and as 0 in arithmetic', () => {
    expect(run('missing')).toBeNull();
    expect(run('missing + 1')).toBe(1);
    expect(holds('missing', scope({}))).toBe(false);
  });

  it('names what it reads', () => {
    expect(dependencies(parseExpression('subtotal + sum(items.amount) * tax_rate'))).toEqual(['subtotal', 'items.amount', 'tax_rate']);
  });

  it('refuses anything that is not an expression', () => {
    for (const bad of ['1 +', 'eval(x)', 'a = 1', "'open", 'a b', '(1', 'and']) {
      expect(() => parseExpression(bad), bad).toThrow(ExpressionError);
    }
  });
});
