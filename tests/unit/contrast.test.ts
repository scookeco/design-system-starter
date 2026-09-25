import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATEGORICAL,
  CHART_SURFACES,
  CHART_TOKENS,
  DIVERGING,
  RULES,
  SEQUENTIAL,
  categoricalProblems,
  divergingProblems,
  rampProblems,
} from '../../scripts/checks/chart-palette';
import { contrastRatio } from '../../scripts/checks/contrast';
import { pairs, TEXT } from '../../scripts/checks/contrast-pairs';
import { loadTokenSource, resolveColor } from '../../scripts/checks/token-source';

const tokens = loadTokenSource(resolve(import.meta.dirname, '../../tokens'));

describe.each(['light', 'dark'] as const)('contrast in %s mode', (mode) => {
  it.each(pairs)('$fg on $bg >= $min:1', ({ fg, bg, min }) => {
    const ratio = contrastRatio(resolveColor(tokens, fg, mode), resolveColor(tokens, bg, mode));
    expect(ratio, `${fg} on ${bg} in ${mode}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});

describe('contrast maths', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('composites translucent foregrounds over the background', () => {
    expect(contrastRatio('#00000000', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('fails a pair that is too close (negative control)', () => {
    expect(contrastRatio('#94a3b8', '#ffffff')).toBeLessThan(TEXT);
  });
});

// Chart colours (scripts/checks/chart-palette.ts; shown on Foundations/Data visualisation).
describe.each(['light', 'dark'] as const)('chart palette in %s mode', (mode) => {
  const resolve = (path: string) => resolveColor(tokens, path, mode);

  it.each(CHART_TOKENS.flatMap((fg) => CHART_SURFACES.map((bg) => ({ fg, bg }))))('$fg on $bg >= 3:1', ({ fg, bg }) => {
    const ratio = contrastRatio(resolve(fg), resolve(bg));
    expect(ratio, `${fg} on ${bg} in ${mode}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(RULES.MARK_CONTRAST);
  });

  it('adjacent categorical colours are distinguishable, with and without colour-vision deficiency', () => {
    expect(categoricalProblems(CATEGORICAL, resolve)).toEqual([]);
  });

  it('the sequential ramp stands out more at every step', () => {
    expect(rampProblems(SEQUENTIAL, resolve)).toEqual([]);
  });

  it('the diverging scale has a neutral midpoint and arms that stand out more outwards', () => {
    expect(divergingProblems(DIVERGING, resolve)).toEqual([]);
  });
});

describe('chart palette checks catch violations', () => {
  const hex: Record<string, string> = {
    'color.bg.canvas': '#ffffff',
    'color.bg.surface': '#ffffff',
    'color.bg.subtle': '#ffffff',
    'color.bg.elevated': '#ffffff',
    a: '#2563eb',
    b: '#2a66e8',
    grey: '#6b6b6b',
    red: '#d62728',
    green: '#4d8a26',
    light: '#3b82f6',
    darker: '#3a80f2',
  };
  const resolve = (path: string) => hex[path] ?? '#000000';

  it('reports near-identical neighbours', () => {
    expect(categoricalProblems(['a', 'b'], resolve).some((p) => p.includes('normal vision'))).toBe(true);
  });

  it('reports a pair that collapses under deuteranopia', () => {
    expect(categoricalProblems(['red', 'green'], resolve)).toEqual([expect.stringContaining('protanopia/deuteranopia')]);
  });

  it('reports a grey categorical colour', () => {
    expect(categoricalProblems(['grey'], resolve)).toEqual([expect.stringContaining('chroma')]);
  });

  it('reports a ramp step that does not stand out more', () => {
    expect(rampProblems(['light', 'darker'], resolve).some((p) => p.includes('lightness step'))).toBe(true);
    expect(rampProblems(['a', 'light'], resolve).some((p) => p.includes('does not stand out more'))).toBe(true);
  });

  it('reports a coloured diverging midpoint', () => {
    expect(divergingProblems(['grey', 'a', 'grey'], resolve)).toEqual(expect.arrayContaining([expect.stringContaining('not neutral')]));
  });
});
