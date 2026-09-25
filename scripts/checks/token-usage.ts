/**
 * Token usage: which tokens each component, primitive and layout reads, directly or through
 * the system parts it composes. Written to src/tokens/token-usage.json by scripts/token-usage.ts,
 * shown in the gallery's "Tokens" panel, and shaped (src/tokens/token-usage.schema.json) so a
 * machine-readable manifest can consume it as is.
 *
 * Two kinds of read are recorded:
 * - "css": a var(--token) in the unit's own stylesheets (component-local properties such as
 *   --button-bg are not tokens; the tokens they point at are);
 * - "prop": a token family selected by a prop in TSX, such as vars.space.gap[gap]. Every token in
 *   the family is listed, because any of them can be chosen.
 *
 * Composition follows static value imports between units only (not `import type`, not internal
 * helpers). Content passed in through props or slots (an AppShell's nav, a Card's body) belongs
 * to the caller, so it is not included.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { aliasTarget, resolveValue, type SourceToken, type Tier, type TokenMap } from './token-model.ts';

export type UnitKind = 'component' | 'primitive' | 'layout';
export type ReadKind = 'css' | 'prop';

/** One component, primitive or layout folder, as read from disk. */
export interface UnitSource {
  name: string;
  kind: UnitKind;
  /** Repo-relative folder, POSIX separators: src/components/Button */
  dir: string;
  /** Names exported from the public entry that this folder defines. */
  exports: string[];
  stylesheets: { file: string; css: string }[];
  /** Non-story TypeScript sources: { file, code }. */
  modules: { file: string; code: string }[];
}

export interface TokenRead {
  /** The unit whose stylesheet or props read the token. */
  unit: string;
  how: ReadKind;
}

export interface UnitUsage {
  kind: UnitKind;
  dir: string;
  exports: string[];
  stylesheets: string[];
  /** Units this one imports directly. */
  composes: string[];
  /** Every unit reached through composition, transitively. */
  composesAll: string[];
  tokens: { token: string; readBy: TokenRead[] }[];
}

export interface ModeValue {
  value: string;
  chain: string[];
}

export interface TokenInfo {
  cssVar: string;
  tier: Tier;
  type: string | null;
  description: string | null;
  /** The base (light) value as CSS text, and the alias chain that produced it. */
  value: string;
  chain: string[];
  /** Values in other modes (dark, reduced-motion), only where the token defines one. */
  modes: Record<string, ModeValue>;
}

export interface TokenUsage {
  $schema: string;
  $comment: string;
  units: Record<string, UnitUsage>;
  tokens: Record<string, TokenInfo>;
}

const KIND_DIRS: Record<UnitKind, string> = { component: 'src/components', primitive: 'src/primitives', layout: 'src/layouts' };
const KIND_ORDER: UnitKind[] = ['primitive', 'component', 'layout'];

const posix = (p: string) => p.split(sep).join('/');
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const VAR_USE = /var\(\s*--([\w-]+)/g;
// Static value imports and side-effect imports; `import type` is skipped.
const IMPORT = /^\s*import\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
// vars.space.gap[gap], vars.size['scroll-region'][maxHeight]: a family chosen by a prop.
const PROP_FAMILY = /\bvars((?:\.[\w-]+|\[['"][\w-]+['"]\])+)\[(?!['"])/g;
const EXPORT_LINE = /export\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w-]+)\/[\w-]+['"]/g;

const cssNameToPath = (tokens: TokenMap) => {
  const map = new Map<string, string>();
  for (const path of tokens.keys()) map.set(path.replaceAll('.', '-'), path);
  return map;
};

/** Read every unit folder under src/components, src/primitives and src/layouts. */
export const collectUnits = (root: string): UnitSource[] => {
  const units: UnitSource[] = [];
  for (const kind of KIND_ORDER) {
    const base = join(root, KIND_DIRS[kind]);
    const barrel = readFileSync(join(base, 'index.ts'), 'utf8');
    const exportsByDir = new Map<string, string[]>();
    for (const m of barrel.matchAll(EXPORT_LINE)) {
      const names = (m[1] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('type '));
      exportsByDir.set(m[2] ?? '', names);
    }
    for (const entry of readdirSync(base).sort(byName)) {
      const dir = join(base, entry);
      if (!statSync(dir).isDirectory()) continue;
      const files = readdirSync(dir).sort(byName);
      units.push({
        name: entry,
        kind,
        dir: posix(relative(root, dir)),
        exports: [...(exportsByDir.get(entry) ?? [])].sort(byName),
        stylesheets: files
          .filter((f) => f.endsWith('.css'))
          .map((f) => ({ file: posix(relative(root, join(dir, f))), css: readFileSync(join(dir, f), 'utf8') })),
        modules: files
          .filter((f) => /\.tsx?$/.test(f) && !/\.stories\.tsx?$/.test(f))
          .map((f) => ({ file: posix(relative(root, join(dir, f))), code: readFileSync(join(dir, f), 'utf8') })),
      });
    }
  }
  return units;
};

/** The unit a relative import lands in, or undefined when it leaves the system's unit folders. */
const importedUnit = (fromFile: string, spec: string, units: UnitSource[]): string | undefined => {
  if (!spec.startsWith('.')) return undefined;
  const target = posix(resolve('/', dirname(fromFile), spec)).slice(1);
  for (const kind of KIND_ORDER) {
    if (target === KIND_DIRS[kind] || target === `${KIND_DIRS[kind]}/index`) {
      throw new Error(`${fromFile} imports the ${kind} barrel (${spec}); import the unit's own module so composition can be traced`);
    }
  }
  return units.find((u) => target.startsWith(`${u.dir}/`))?.name;
};

/** Strip comments so a var() or import mentioned in prose is not counted. */
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const directReads = (unit: UnitSource, tokens: TokenMap, names: Map<string, string>): Map<string, ReadKind[]> => {
  const reads = new Map<string, ReadKind[]>();
  const add = (path: string, how: ReadKind) => {
    const list = reads.get(path) ?? [];
    if (!list.includes(how)) list.push(how);
    reads.set(path, list);
  };
  for (const { css } of unit.stylesheets) {
    for (const m of stripCssComments(css).matchAll(VAR_USE)) {
      const path = names.get(m[1] ?? '');
      if (path) add(path, 'css');
    }
  }
  for (const { file, code } of unit.modules) {
    for (const m of stripJsComments(code).matchAll(PROP_FAMILY)) {
      const prefix = [...(m[1] ?? '').matchAll(/\.([\w-]+)|\[['"]([\w-]+)['"]\]/g)].map((k) => k[1] ?? k[2]).join('.');
      const family = [...tokens.keys()].filter((p) => p.startsWith(`${prefix}.`));
      if (family.length === 0) throw new Error(`${file}: vars.${prefix}[…] matches no token`);
      for (const path of family) add(path, 'prop');
    }
  }
  return reads;
};

const modeChain = (tokens: TokenMap, path: string, mode: string | undefined): string[] => {
  const chain = [path];
  let current: SourceToken | undefined = tokens.get(path);
  while (current) {
    const raw = mode !== undefined && current.modes[mode] !== undefined ? current.modes[mode] : current.value;
    const next = aliasTarget(raw);
    if (!next || chain.includes(next)) break;
    chain.push(next);
    current = tokens.get(next);
  }
  return chain;
};

/** A resolved value as CSS text. Mirrors the CSS the token build writes, with aliases resolved. */
export const cssText = (value: unknown, type: string | undefined): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
    if (type === 'shadow') return value.map((layer) => cssText(layer, 'shadow')).join(', ');
    return value.map((v) => (/\s/.test(String(v)) ? `"${String(v)}"` : String(v))).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if ('value' in v && 'unit' in v) return v.value === 0 && type === 'dimension' ? '0' : `${String(v.value)}${String(v.unit)}`;
    if (type === 'typography') {
      return `${cssText(v.fontWeight, 'fontWeight')} ${cssText(v.fontSize, 'dimension')}/${cssText(v.lineHeight, 'number')} ${cssText(v.fontFamily, 'fontFamily')}`;
    }
    if (type === 'shadow') {
      return [v.inset === true ? 'inset' : '', ...[v.offsetX, v.offsetY, v.blur, v.spread].map((d) => cssText(d, 'dimension')), cssText(v.color, 'color')]
        .filter(Boolean)
        .join(' ');
    }
  }
  return JSON.stringify(value);
};

/** Resolve a token in a mode: follow the mode's alias where one is defined, the base value elsewhere. */
const valueIn = (tokens: TokenMap, path: string, mode: string | undefined): string => {
  const chain = modeChain(tokens, path, mode);
  const last = chain.at(-1) ?? path;
  const token = tokens.get(last);
  if (!token) throw new Error(`Unknown token ${last}`);
  // The chain ends at a raw value. Composite values (typography, shadow) still hold aliases
  // inside; resolve those too.
  return cssText(resolveValue(tokens, last, mode === 'dark' ? 'dark' : 'light'), tokens.get(path)?.type);
};

/** One token's tier, value, alias chain and mode values. Also used by the agent manifest. */
export const tokenInfo = (tokens: TokenMap, path: string): TokenInfo => {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unknown token ${path}`);
  // Collect every mode defined anywhere along the base chain (a semantic token's dark value, a
  // duration's reduced-motion value).
  const modeNames = new Set<string>();
  for (const step of modeChain(tokens, path, undefined)) for (const mode of Object.keys(tokens.get(step)?.modes ?? {})) modeNames.add(mode);
  const modes: Record<string, ModeValue> = {};
  for (const mode of [...modeNames].sort(byName)) modes[mode] = { value: valueIn(tokens, path, mode), chain: modeChain(tokens, path, mode) };
  return {
    cssVar: `--${path.replaceAll('.', '-')}`,
    tier: token.tier,
    type: token.type ?? null,
    description: token.description ?? null,
    value: valueIn(tokens, path, undefined),
    chain: modeChain(tokens, path, undefined),
    modes,
  };
};

export const SCHEMA_PATH = './token-usage.schema.json';
export const COMMENT = 'Generated by scripts/token-usage.ts from the stylesheets and TSX in src/{primitives,components,layouts} and the token source. Do not edit by hand: run npm run tokens.';

/** Build the usage map from unit sources and the token source. Deterministic: keys and lists are sorted. */
export const buildTokenUsage = (units: UnitSource[], tokens: TokenMap): TokenUsage => {
  const names = cssNameToPath(tokens);
  const direct = new Map(units.map((u) => [u.name, directReads(u, tokens, names)]));
  const composes = new Map(
    units.map((u) => {
      const set = new Set<string>();
      for (const { file, code } of u.modules) {
        for (const m of stripJsComments(code).matchAll(IMPORT)) {
          const target = importedUnit(file, m[1] ?? '', units);
          if (target && target !== u.name) set.add(target);
        }
      }
      return [u.name, [...set].sort(byName)];
    }),
  );
  const closure = (name: string): string[] => {
    const seen = new Set<string>();
    const visit = (n: string) => {
      for (const c of composes.get(n) ?? []) {
        if (c !== name && !seen.has(c)) {
          seen.add(c);
          visit(c);
        }
      }
    };
    visit(name);
    return [...seen].sort(byName);
  };

  const used = new Set<string>();
  const out: Record<string, UnitUsage> = {};
  for (const unit of [...units].sort((a, b) => byName(a.name, b.name))) {
    const all = closure(unit.name);
    const reads = new Map<string, TokenRead[]>();
    for (const source of [unit.name, ...all]) {
      for (const [path, hows] of direct.get(source) ?? []) {
        for (const how of hows) reads.set(path, [...(reads.get(path) ?? []), { unit: source, how }]);
      }
    }
    const tokenList = [...reads]
      .sort(([a], [b]) => byName(a, b))
      .map(([token, readBy]) => {
        used.add(token);
        return { token, readBy: readBy.sort((a, b) => byName(a.unit, b.unit) || byName(a.how, b.how)) };
      });
    out[unit.name] = {
      kind: unit.kind,
      dir: unit.dir,
      exports: unit.exports,
      stylesheets: unit.stylesheets.map((s) => s.file),
      composes: composes.get(unit.name) ?? [],
      composesAll: all,
      tokens: tokenList,
    };
  }
  const info: Record<string, TokenInfo> = {};
  for (const path of [...used].sort(byName)) info[path] = tokenInfo(tokens, path);
  return { $schema: SCHEMA_PATH, $comment: COMMENT, units: out, tokens: info };
};

/** The one serialisation used for the committed file and the staleness check. */
export const serialize = (usage: TokenUsage): string => `${JSON.stringify(usage, null, 2)}\n`;

interface SchemaNode {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, SchemaNode>;
  additionalProperties?: SchemaNode | boolean;
  items?: SchemaNode;
  enum?: unknown[];
}

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? 'number' : typeof v);

/**
 * A small JSON Schema subset check (type, required, properties, additionalProperties, items, enum):
 * enough to keep the committed schema and the generated map from drifting apart, without a validator dependency.
 */
export const schemaProblems = (value: unknown, schema: SchemaNode, at = '$'): string[] => {
  const problems: string[] = [];
  const t = typeOf(value);
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.includes(t) && !(t === 'number' && allowed.includes('integer'))) return [`${at}: expected ${allowed.join('|')}, got ${t}`];
  }
  if (schema.enum && !schema.enum.includes(value)) problems.push(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in obj)) problems.push(`${at}: missing "${key}"`);
    for (const [key, child] of Object.entries(obj)) {
      const sub = schema.properties?.[key] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined);
      if (sub) problems.push(...schemaProblems(child, sub, `${at}.${key}`));
      else if (schema.additionalProperties === false) problems.push(`${at}: unexpected "${key}"`);
    }
  }
  if (t === 'array' && schema.items) (value as unknown[]).forEach((item, i) => problems.push(...schemaProblems(item, schema.items as SchemaNode, `${at}[${String(i)}]`)));
  return problems;
};
