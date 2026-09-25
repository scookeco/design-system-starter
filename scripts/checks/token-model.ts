/**
 * The DTCG token model: parse token documents, check them, resolve aliases.
 * Pure (no file system), so the Storybook Foundations pages use exactly the logic the tests use.
 * scripts/checks/token-source.ts adds the file-system loader for Node.
 */
export type Tier = 'primitive' | 'semantic' | 'component';
export const MODES_KEY = 'starter.modes';

export interface SourceToken {
  path: string;
  tier: Tier;
  type: string | undefined;
  value: unknown;
  modes: Record<string, unknown>;
  file: string;
  /** The token's own $description, or the nearest enclosing group's. */
  description: string | undefined;
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

interface Inherited {
  type: string | undefined;
  description: string | undefined;
}

const walk = (node: Record<string, unknown>, path: string[], inherited: Inherited, tier: Tier, file: string, out: TokenMap) => {
  const type = typeof node.$type === 'string' ? node.$type : inherited.type;
  const description = typeof node.$description === 'string' ? node.$description : inherited.description;
  if ('$value' in node) {
    const key = path.join('.');
    if (out.has(key)) throw new Error(`Duplicate token ${key} in ${file} and ${out.get(key)?.file ?? '?'}`);
    const extensions = (node.$extensions ?? {}) as Record<string, unknown>;
    out.set(key, { path: key, tier, type, value: node.$value, modes: (extensions[MODES_KEY] ?? {}) as Record<string, unknown>, file, description });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child as Record<string, unknown>, [...path, key], { type, description }, tier, file, out);
  }
};

/** Parse token documents: `{ tier, file, json }` triples. Exposed for tests with synthetic input. */
export const parseTokens = (docs: { tier: Tier; file: string; json: Record<string, unknown> }[]): TokenMap => {
  const out: TokenMap = new Map();
  for (const doc of docs) walk(doc.json, [], { type: undefined, description: undefined }, doc.tier, doc.file, out);
  return out;
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

/**
 * Resolve any token to its raw value in a mode, following aliases everywhere inside it
 * (composite values such as typography and shadow included).
 */
export const resolveValue = (tokens: TokenMap, path: string, mode: 'light' | 'dark' = 'light', seen: string[] = []): unknown => {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unknown token ${path}`);
  if (seen.includes(path)) throw new Error(`Alias cycle: ${[...seen, path].join(' -> ')}`);
  const deep = (value: unknown): unknown => {
    const target = aliasTarget(value);
    if (target) return resolveValue(tokens, target, mode, [...seen, path]);
    if (Array.isArray(value)) return value.map(deep);
    if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deep(v)]));
    return value;
  };
  return deep(mode === 'dark' && token.modes.dark !== undefined ? token.modes.dark : token.value);
};
