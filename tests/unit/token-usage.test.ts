import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTokenUsage, collectUnits, schemaProblems, serialize, type UnitSource } from '../../scripts/checks/token-usage';
import { loadTokenSource, parseTokens } from '../../scripts/checks/token-source';

const root = resolve(import.meta.dirname, '../..');
const tokens = loadTokenSource(join(root, 'tokens'));
const committed = readFileSync(join(root, 'src/tokens/token-usage.json'), 'utf8');
const schema = JSON.parse(readFileSync(join(root, 'src/tokens/token-usage.schema.json'), 'utf8')) as Parameters<typeof schemaProblems>[1];
const fresh = buildTokenUsage(collectUnits(root), tokens);

describe('token usage map', () => {
  it('is up to date (run "npm run tokens" if this fails)', () => {
    expect(committed === serialize(fresh), 'src/tokens/token-usage.json is stale. Run "npm run tokens" and commit the result.').toBe(true);
  });

  it('matches its schema', () => {
    expect(schemaProblems(JSON.parse(committed), schema)).toEqual([]);
  });

  it('covers every component, primitive and layout folder', () => {
    const kinds = Object.values(fresh.units).map((u) => u.kind);
    expect(kinds.filter((k) => k === 'primitive').length).toBeGreaterThan(5);
    expect(kinds.filter((k) => k === 'component').length).toBeGreaterThan(30);
    expect(kinds.filter((k) => k === 'layout').length).toBeGreaterThan(3);
  });

  it('includes tokens reached through composed components', () => {
    const button = fresh.units.Button;
    expect(button?.composesAll).toEqual(expect.arrayContaining(['Icon', 'Spinner']));
    const iconTokens = fresh.units.Icon?.tokens.map((t) => t.token) ?? [];
    expect(iconTokens.length).toBeGreaterThan(0);
    expect(button?.tokens.map((t) => t.token)).toEqual(expect.arrayContaining(iconTokens));
  });

  it('never lists primitives as read by system CSS', () => {
    for (const unit of Object.values(fresh.units)) {
      for (const { token, readBy } of unit.tokens) {
        if (readBy.some((r) => r.how === 'css')) expect(fresh.tokens[token]?.tier, token).not.toBe('primitive');
      }
    }
  });
});

// Negative controls with synthetic sources: prove each rule does what it claims.
describe('token usage builder', () => {
  const synthetic = parseTokens([
    {
      tier: 'primitive',
      file: 'primitive/p.json',
      json: { color: { $type: 'color', gray: { 900: { $value: '#111111' }, 50: { $value: '#fafafa' } } }, gap: { $type: 'dimension', 1: { $value: { value: 1, unit: 'rem' } }, 2: { $value: { value: 2, unit: 'rem' } } } },
    },
    {
      tier: 'semantic',
      file: 'semantic/s.json',
      json: {
        color: { $type: 'color', fg: { $value: '{color.gray.900}', $extensions: { 'starter.modes': { dark: '{color.gray.50}' } } } },
        space: { $type: 'dimension', gap: { sm: { $value: '{gap.1}' }, md: { $value: '{gap.2}' } } },
      },
    },
  ]);
  const unit = (name: string, css: string, code: string, kind: UnitSource['kind'] = 'component'): UnitSource => ({
    name,
    kind,
    dir: `src/${kind === 'primitive' ? 'primitives' : 'components'}/${name}`,
    exports: [name],
    stylesheets: [{ file: `src/components/${name}/${name}.css`, css }],
    modules: [{ file: `src/${kind === 'primitive' ? 'primitives' : 'components'}/${name}/${name}.tsx`, code }],
  });

  it('follows composition transitively and records who reads what', () => {
    const usage = buildTokenUsage(
      [
        unit('Outer', '.outer { gap: var(--space-gap-sm); }', "import { Inner } from '../Inner/Inner';\nimport type { Other } from '../Other/Other';"),
        unit('Inner', '/* var(--space-gap-md) in a comment is ignored */', "import { Leaf } from '../Leaf/Leaf';"),
        unit('Leaf', '.leaf { color: var(--color-fg); --leaf-local: var(--color-fg); }', ''),
        unit('Other', '.other { gap: var(--space-gap-md); }', ''),
      ],
      synthetic,
    );
    expect(usage.units.Outer?.composes).toEqual(['Inner']);
    expect(usage.units.Outer?.composesAll).toEqual(['Inner', 'Leaf']);
    expect(usage.units.Outer?.tokens).toEqual([
      { token: 'color.fg', readBy: [{ unit: 'Leaf', how: 'css' }] },
      { token: 'space.gap.sm', readBy: [{ unit: 'Outer', how: 'css' }] },
    ]);
    expect(usage.tokens['color.fg']).toMatchObject({
      tier: 'semantic',
      value: '#111111',
      chain: ['color.fg', 'color.gray.900'],
      modes: { dark: { value: '#fafafa', chain: ['color.fg', 'color.gray.50'] } },
    });
  });

  it('lists a prop-selected family as prop reads', () => {
    const usage = buildTokenUsage([unit('Stackish', '', "style={{ '--g': vars.space.gap[gap] }}", 'primitive')], synthetic);
    expect(usage.units.Stackish?.tokens).toEqual([
      { token: 'space.gap.md', readBy: [{ unit: 'Stackish', how: 'prop' }] },
      { token: 'space.gap.sm', readBy: [{ unit: 'Stackish', how: 'prop' }] },
    ]);
  });

  it('refuses barrel imports, which would hide composition', () => {
    expect(() => buildTokenUsage([unit('Bad', '', "import { Stack } from '../../primitives';")], synthetic)).toThrow(/barrel/);
  });

  it('detects a stale map', () => {
    const before = serialize(buildTokenUsage([unit('A', '.a { gap: var(--space-gap-sm); }', '')], synthetic));
    const after = serialize(buildTokenUsage([unit('A', '.a { gap: var(--space-gap-md); }', '')], synthetic));
    expect(before).not.toBe(after);
  });

  it('reports schema problems', () => {
    const broken = JSON.parse(committed) as { units: Record<string, Record<string, unknown>> };
    const first = Object.keys(broken.units)[0] ?? '';
    delete broken.units[first]?.composesAll;
    (broken.units[first] as Record<string, unknown>).kind = 'widget';
    expect(schemaProblems(broken, schema)).toEqual([
      `$.units.${first}: missing "composesAll"`,
      `$.units.${first}.kind: "widget" is not one of ["primitive","component","layout"]`,
    ]);
  });
});
