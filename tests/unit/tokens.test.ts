import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findBrokenAliases,
  findColorsWithoutDark,
  findTierViolations,
  loadTokenSource,
  parseTokens,
  resolveColor,
} from '../../scripts/checks/token-source';

const tokens = loadTokenSource(resolve(import.meta.dirname, '../../tokens'));

describe('token source', () => {
  it('loads every tier', () => {
    const tiers = new Set([...tokens.values()].map((t) => t.tier));
    expect([...tiers].sort()).toEqual(['component', 'primitive', 'semantic']);
    expect(tokens.size).toBeGreaterThan(150);
  });

  it('every alias resolves, in every mode', () => {
    expect(findBrokenAliases(tokens)).toEqual([]);
  });

  it('references flow one way: component -> semantic -> primitive', () => {
    expect(findTierViolations(tokens)).toEqual([]);
  });

  it('every semantic colour carries a dark value', () => {
    expect(findColorsWithoutDark(tokens)).toEqual([]);
  });

  it('every semantic colour resolves to a hex value in light and dark', () => {
    for (const token of tokens.values()) {
      if (token.tier === 'primitive' || token.type !== 'color') continue;
      for (const mode of ['light', 'dark'] as const) {
        expect(resolveColor(tokens, token.path, mode), `${token.path} (${mode})`).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
      }
    }
  });
});

// Negative controls: prove each check reports a problem when one exists.
describe('token checks catch violations', () => {
  const synthetic = parseTokens([
    { tier: 'primitive', file: 'p.json', json: { color: { $type: 'color', gray: { $value: '#777777' } } } },
    {
      tier: 'semantic',
      file: 's.json',
      json: {
        color: {
          $type: 'color',
          broken: { $value: '{color.missing}' },
          'broken-dark': { $value: '{color.gray}', $extensions: { 'starter.modes': { dark: '{color.nope}' } } },
          light: { $value: '{color.gray}' },
          'skips-down': { $value: '{color.light}', $extensions: { 'starter.modes': { dark: '{color.gray}' } } },
        },
      },
    },
    { tier: 'component', file: 'c.json', json: { card: { $type: 'color', bg: { $value: '{color.gray}' } } } },
  ]);

  it('reports broken aliases in $value and in modes', () => {
    expect(findBrokenAliases(synthetic)).toEqual([
      'color.broken ($value) -> {color.missing} does not exist',
      'color.broken-dark (mode dark) -> {color.nope} does not exist',
    ]);
  });

  it('reports tier violations', () => {
    const problems = findTierViolations(synthetic);
    expect(problems).toContain('semantic token color.skips-down references semantic token color.light (only primitive allowed)');
    expect(problems).toContain('component token card.bg references primitive token color.gray (only semantic allowed)');
  });

  it('reports semantic colours without a dark value', () => {
    expect(findColorsWithoutDark(synthetic)).toEqual(['color.broken', 'color.light']);
  });
});
