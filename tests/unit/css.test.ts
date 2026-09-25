import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  declaredCustomProperties,
  findLayerStatements,
  findPrimitiveReads,
  findUndefinedVars,
  findUnlayeredRules,
  findUntokenedQueryLengths,
} from '../../scripts/checks/css';
import { loadTokenSource, resolveDimension } from '../../scripts/checks/token-source';

const root = resolve(import.meta.dirname, '../..');
const LAYERS = ['reset', 'tokens', 'base', 'primitives', 'components', 'layouts', 'utilities'] as const;

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? cssFiles(full) : entry.endsWith('.css') ? [full] : [];
  });

const all = cssFiles(join(root, 'src')).map((full) => ({ file: relative(root, full), css: readFileSync(full, 'utf8') }));
const tokenCss = all.find((f) => f.file === 'src/styles/tokens.css');
const entry = all.find((f) => f.file === 'src/styles/index.css');
const authored = all.filter((f) => f !== tokenCss && f !== entry);
const systemStyles = authored.filter((f) => /^src\/(components|primitives|layouts)\//.test(f.file));

const source = loadTokenSource(join(root, 'tokens'));
const tokenNames = (tier: string) =>
  new Set([...source.values()].filter((t) => t.tier === tier).map((t) => `--${t.path.replaceAll('.', '-')}`));
const breakpoints = new Set([...source.keys()].filter((path) => path.startsWith('size.breakpoint.')).map((path) => resolveDimension(source, path)));

describe('stylesheets', () => {
  it('found the generated tokens and the entry stylesheet', () => {
    expect(tokenCss).toBeDefined();
    expect(entry).toBeDefined();
    expect(systemStyles.length).toBeGreaterThan(10);
  });

  it('every var() used is defined by a token or a component-local property', () => {
    expect(findUndefinedVars(all, declaredCustomProperties(tokenCss?.css ?? ''))).toEqual([]);
  });

  it('the generated CSS defines exactly the tokens in the source', () => {
    const expected = new Set([...tokenNames('primitive'), ...tokenNames('semantic'), ...tokenNames('component')]);
    expect(declaredCustomProperties(tokenCss?.css ?? '')).toEqual(expected);
  });

  it('found the breakpoint tokens', () => {
    expect(breakpoints.size).toBeGreaterThan(0);
  });

  it('every media and container query length is a breakpoint token value', () => {
    expect(findUntokenedQueryLengths(authored, breakpoints)).toEqual([]);
  });

  it('components, primitives and layouts never read primitive tokens', () => {
    expect(findPrimitiveReads(systemStyles, tokenNames('primitive'))).toEqual([]);
  });

  it('declares the layer order exactly once, in the entry stylesheet', () => {
    expect(findLayerStatements(all)).toEqual([{ file: 'src/styles/index.css', statement: `@layer ${LAYERS.join(', ')};` }]);
  });

  it('every other stylesheet puts all its rules inside a declared layer', () => {
    expect(findUnlayeredRules(authored.concat(tokenCss ? [tokenCss] : []), LAYERS)).toEqual([]);
  });
});

// Negative controls: prove each check reports a problem when one exists.
describe('css checks catch violations', () => {
  it('reports an undefined var()', () => {
    expect(findUndefinedVars([{ file: 'x.css', css: '.x { color: var(--color-typo); }' }], new Set(['--color-fg-default']))).toEqual([
      'x.css: var(--color-typo) is not defined',
    ]);
  });

  it('accepts locally declared and vendor runtime properties', () => {
    const css = '.x { --x-gap: var(--space-gap-md); gap: var(--x-gap); min-inline-size: var(--radix-select-trigger-width); }';
    expect(findUndefinedVars([{ file: 'x.css', css }], new Set(['--space-gap-md']))).toEqual([]);
  });

  it('reports a primitive read', () => {
    expect(findPrimitiveReads([{ file: 'x.css', css: '.x { color: var(--color-gray-600); }' }], new Set(['--color-gray-600']))).toEqual([
      'x.css: reads primitive token --color-gray-600',
    ]);
  });

  it('reports unlayered rules and unknown layers', () => {
    const css = '.loose { color: var(--x); }\n@layer mystery { .y { color: var(--x); } }\n@layer components { .ok { color: var(--x); } }';
    expect(findUnlayeredRules([{ file: 'x.css', css }], LAYERS)).toEqual([
      'x.css: ".loose" is outside a declared layer',
      'x.css: "@layer mystery" is outside a declared layer',
    ]);
  });

  it('reports a query length that is not a breakpoint token', () => {
    const css = '@layer layouts { @container shell (inline-size < 47rem) { .x { display: none; } } @media (width >= 48rem) { .y { display: none; } } }';
    expect(findUntokenedQueryLengths([{ file: 'x.css', css }], new Set(['48rem']))).toEqual([
      'x.css: @container uses 47rem, which is not a size.breakpoint token value',
    ]);
  });

  it('reports a second layer-order statement', () => {
    expect(findLayerStatements([{ file: 'x.css', css: '@layer a, b;' }])).toHaveLength(1);
  });
});
