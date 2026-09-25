/**
 * Reads the DTCG token source independently of Style Dictionary, so the checks
 * below do not trust the build they are checking.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type Tier = 'primitive' | 'semantic' | 'component';
export const MODES_KEY = 'starter.modes';

export interface SourceToken {
  path: string;
  tier: Tier;
  type: string | undefined;
  value: unknown;
  modes: Record<string, unknown>;
  file: string;
}

export type TokenMap = Map<string, SourceToken>;

const ALIAS = /^\{([^{}]+)\}$/;
export const aliasTarget = (value: unknown): string | undefined =>
  typeof value === 'string' ? ALIAS.exec(value)?.[1] : undefined;

/** All alias targets inside a value, including inside composite values (shadow, typography). */
export const aliasTargets = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const target = aliasTarget(value);
    return target ? [target] : [];
  }
  if (Array.isArray(value)) return value.flatMap(aliasTargets);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(aliasTargets);
  return [];
};

const walk = (node: Record<string, unknown>, path: string[], inheritedType: string | undefined, tier: Tier, file: string, out: TokenMap) => {
  const type = typeof node.$type === 'string' ? node.$type : inheritedType;
  if ('$value' in node) {
    const key = path.join('.');
    if (out.has(key)) throw new Error(`Duplicate token ${key} in ${file} and ${out.get(key)?.file ?? '?'}`);
    const extensions = (node.$extensions ?? {}) as Record<string, unknown>;
    out.set(key, { path: key, tier, type, value: node.$value, modes: (extensions[MODES_KEY] ?? {}) as Record<string, unknown>, file });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child as Record<string, unknown>, [...path, key], type, tier, file, out);
  }
};

/** Parse token documents: `{ tier, file, json }` triples. Exposed for tests with synthetic input. */
export const parseTokens = (docs: { tier: Tier; file: string; json: Record<string, unknown> }[]): TokenMap => {
  const out: TokenMap = new Map();
  for (const doc of docs) walk(doc.json, [], undefined, doc.tier, doc.file, out);
  return out;
};

export const loadTokenSource = (dir: string): TokenMap => {
  const docs: { tier: Tier; file: string; json: Record<string, unknown> }[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) visit(full);
      else if (entry.endsWith('.json')) {
        const tier = relative(dir, full).split(/[\\/]/)[0] as Tier;
        docs.push({ tier, file: relative(dir, full), json: JSON.parse(readFileSync(full, 'utf8')) as Record<string, unknown> });
      }
    }
  };
  visit(dir);
  return parseTokens(docs);
};

/** Every alias (in $value and in every mode) must point at an existing token. */
export const findBrokenAliases = (tokens: TokenMap): string[] => {
  const problems: string[] = [];
  for (const token of tokens.values()) {
    const values = [['$value', token.value], ...Object.entries(token.modes).map(([mode, v]) => [`mode ${mode}`, v])] as const;
    for (const [where, value] of values) {
      for (const target of aliasTargets(value)) {
        if (!tokens.has(target)) problems.push(`${token.path} (${where}) -> {${target}} does not exist`);
      }
    }
  }
  return problems;
};

const ALLOWED_TARGET_TIER: Record<Tier, Tier | null> = { primitive: null, semantic: 'primitive', component: 'semantic' };

/** References flow one way: component -> semantic -> primitive. Primitives hold raw values only. */
export const findTierViolations = (tokens: TokenMap): string[] => {
  const problems: string[] = [];
  for (const token of tokens.values()) {
    const targets = [token.value, ...Object.values(token.modes)].flatMap(aliasTargets);
    for (const target of targets) {
      const targetTier = tokens.get(target)?.tier;
      if (!targetTier) continue;
      const allowed = ALLOWED_TARGET_TIER[token.tier];
      if (allowed !== targetTier) {
        problems.push(`${token.tier} token ${token.path} references ${targetTier} token ${target}${allowed ? ` (only ${allowed} allowed)` : ' (primitives hold raw values)'}`);
      }
    }
  }
  return problems;
};

/** Semantic colours must carry a dark value, so dark mode stays a remap, not a rewrite. */
export const findColorsWithoutDark = (tokens: TokenMap): string[] =>
  [...tokens.values()].filter((t) => t.tier === 'semantic' && t.type === 'color' && t.modes.dark === undefined).map((t) => t.path);

/** Resolve a colour token to its raw value in a mode, following aliases (and mode values) down the tiers. */
export const resolveColor = (tokens: TokenMap, path: string, mode: 'light' | 'dark', seen: string[] = []): string => {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unknown token ${path}`);
  if (seen.includes(path)) throw new Error(`Alias cycle: ${[...seen, path].join(' -> ')}`);
  const value = mode === 'dark' && token.modes.dark !== undefined ? token.modes.dark : token.value;
  const target = aliasTarget(value);
  if (target) return resolveColor(tokens, target, mode, [...seen, path]);
  if (typeof value !== 'string') throw new Error(`${path} is not a colour`);
  return value;
};

/** Resolve a dimension token to its raw CSS length ("48rem"), following aliases down the tiers. */
export const resolveDimension = (tokens: TokenMap, path: string, seen: string[] = []): string => {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unknown token ${path}`);
  if (seen.includes(path)) throw new Error(`Alias cycle: ${[...seen, path].join(' -> ')}`);
  const target = aliasTarget(token.value);
  if (target) return resolveDimension(tokens, target, [...seen, path]);
  const { value, unit } = (token.value ?? {}) as { value?: unknown; unit?: unknown };
  if (typeof value !== 'number' || typeof unit !== 'string') throw new Error(`${path} is not a dimension`);
  return `${String(value)}${unit}`;
};
