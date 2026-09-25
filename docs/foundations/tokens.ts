/**
 * Token data for the Foundations pages, read from the token build rather than copied:
 *
 * - names come from the generated `vars` map (src/tokens/tokens.ts);
 * - type samples, spacing bars, radius corners and shadows paint with each token's var() from tokens.css;
 * - colour swatches and contrast samples paint with values resolved from the DTCG source. The
 *   Storybook CSS build transpiles light-dark() into a pattern that resolves at :root, so a
 *   nested color-scheme can't force the dark column; resolved values show both modes at once;
 * - raw values, dark values, descriptions and contrast ratios come from the DTCG source through
 *   scripts/checks/token-model.ts and contrast.ts, the same code the token and contrast tests run.
 */
import { contrastRatio } from '../../scripts/checks/contrast';
import { pairs, type ContrastPair } from '../../scripts/checks/contrast-pairs';
import { aliasTarget, parseTokens, resolveColor, resolveValue, type Tier, type SourceToken, type TokenMap } from '../../scripts/checks/token-model';
import { vars } from '../../src/index';
import usageMap from '../../src/tokens/token-usage.json';

const files = import.meta.glob<Record<string, unknown>>('../../tokens/**/*.json', { eager: true, import: 'default' });

export const tokens: TokenMap = parseTokens(
  Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, json]) => {
      const file = path.replace(/^.*\/tokens\//, '');
      return { tier: file.split('/')[0] as Tier, file, json };
    }),
);

export interface VarEntry {
  /** Dotted token path: color.fg.default */
  path: string;
  /** The generated reference: var(--color-fg-default) */
  ref: string;
}

/** Flatten a branch of the generated `vars` map into [path, var()] entries, in source order. */
export const varEntries = (branch: object, prefix: string): VarEntry[] =>
  Object.entries(branch).flatMap(([key, value]) =>
    typeof value === 'string' ? [{ path: `${prefix}.${key}`, ref: value }] : varEntries(value as object, `${prefix}.${key}`),
  );

export const token = (path: string): SourceToken => {
  const found = tokens.get(path);
  if (!found) throw new Error(`Token ${path} is in the generated map but not in the source`);
  return found;
};

/** The custom property of any token, primitives included: color.gray.50 → var(--color-gray-50). */
export const cssVar = (path: string) => `var(--${path.replaceAll('.', '-')})`;

export const colorRoles = varEntries(vars.color, 'color');

export const primitives = (type: string): SourceToken[] =>
  [...tokens.values()].filter((t) => t.tier === 'primitive' && t.type === type);

export const light = (path: string) => resolveColor(tokens, path, 'light');
export const dark = (path: string) => resolveColor(tokens, path, 'dark');

export interface RolePairing {
  pair: ContrastPair;
  /** The other token of the pair. */
  against: string;
  /** Whether the role is the foreground of the pair. */
  roleIsForeground: boolean;
  light: number;
  dark: number;
  /** How many tested pairs this role is part of. */
  tested: number;
}

/**
 * The pair shown next to a role: a sibling pair if there is one (status fg with status bg),
 * otherwise the first tested pair that contains it. Undefined for decorative roles.
 */
export const pairingFor = (path: string): RolePairing | undefined => {
  const containing = pairs.filter((p) => p.fg === path || p.bg === path);
  const parent = path.split('.').slice(0, -1).join('.');
  const pair = containing.find((p) => [p.fg, p.bg].every((t) => t.startsWith(`${parent}.`))) ?? containing[0];
  if (!pair) return undefined;
  const ratio = (mode: 'light' | 'dark') =>
    contrastRatio(resolveColor(tokens, pair.fg, mode), resolveColor(tokens, pair.bg, mode));
  return {
    pair,
    against: pair.fg === path ? pair.bg : pair.fg,
    roleIsForeground: pair.fg === path,
    light: ratio('light'),
    dark: ratio('dark'),
    tested: containing.length,
  };
};

export { resolveValue };

/** A resolved value as CSS text: dimensions and durations as "1rem (16px)", "200ms". */
const dim = (d: unknown) => {
  const { value, unit } = d as { value: number; unit: string };
  return value === 0 ? '0' : `${String(value)}${unit}`;
};

export const formatValue = (path: string): string => {
  const value = resolveValue(tokens, path);
  if (token(path).type === 'shadow') {
    const layers = (Array.isArray(value) ? value : [value]) as Record<string, unknown>[];
    return layers.map((l) => [l.offsetX, l.offsetY, l.blur, l.spread].map(dim).join(' ') + ` ${String(l.color)}`).join(', ');
  }
  if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) {
    const { value: n, unit } = value as { value: number; unit: string };
    return unit === 'rem' && n !== 0 ? `${String(n)}rem (${String(n * 16)}px)` : `${String(n)}${unit}`;
  }
  if (Array.isArray(value)) return token(path).type === 'cubicBezier' ? `cubic-bezier(${value.join(', ')})` : value.join(', ');
  return String(value);
};

/** The value a token takes under prefers-reduced-motion, or undefined if it isn't reduced. */
export const reducedMotionValue = (path: string): string | undefined => {
  const target = aliasTarget(token(path).modes['reduced-motion']);
  if (!target) return undefined;
  return formatValue(target);
};

/** Rows of one token group, with the description they share lifted out as the group's note. */
export const scaleGroup = (entries: VarEntry[]) => {
  const descriptions = new Set(entries.map((e) => token(e.path).description));
  const shared = descriptions.size === 1 ? [...descriptions][0] : undefined;
  return {
    note: shared,
    rows: entries.map((e) => ({ ...e, value: formatValue(e.path), note: shared ? undefined : token(e.path).description })),
  };
};

interface UsageToken {
  tier: string;
  type: string;
  chain: string[];
  modes: { dark?: { chain: string[] } };
}

/**
 * Semantic colours whose light or dark value resolves into a primitive ramp ("color.indigo."),
 * with the primitive each mode lands on. Read from the generated token usage map.
 */
export const semanticColoursFrom = (ramp: string) =>
  Object.entries(usageMap.tokens as Record<string, UsageToken>)
    .filter(([, t]) => t.tier === 'semantic' && t.type === 'color')
    .map(([path, t]) => ({ path, light: t.chain.at(-1) ?? '', dark: t.modes.dark?.chain.at(-1) ?? '' }))
    .filter((t) => t.light.startsWith(ramp) || t.dark.startsWith(ramp));
