import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../scripts/checks/contrast';
import { loadTokenSource, resolveColor } from '../../scripts/checks/token-source';

const tokens = loadTokenSource(resolve(import.meta.dirname, '../../tokens'));

/** WCAG 2.2 AA: 4.5:1 for text, 3:1 for UI components and graphical objects. */
const TEXT = 4.5;
const UI = 3;

const SURFACES = ['color.bg.canvas', 'color.bg.surface', 'color.bg.subtle', 'color.bg.elevated'];
const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'];

const pairs: { fg: string; bg: string; min: number }[] = [
  ...SURFACES.flatMap((bg) => [
    { fg: 'color.fg.default', bg, min: TEXT },
    { fg: 'color.fg.muted', bg, min: TEXT },
    { fg: 'color.fg.link', bg, min: TEXT },
    { fg: 'color.border.strong', bg, min: UI },
    { fg: 'color.focus', bg, min: UI },
    { fg: 'color.action.primary', bg, min: UI },
    { fg: 'color.action.danger', bg, min: UI },
    ...STATUSES.map((s) => ({ fg: `color.status.${s}.fg`, bg, min: TEXT })),
  ]),
  { fg: 'color.fg.default', bg: 'color.bg.hover', min: TEXT },
  { fg: 'color.fg.default', bg: 'color.bg.selected', min: TEXT },
  { fg: 'color.fg.inverse', bg: 'color.bg.inverse', min: TEXT },
  { fg: 'color.fg.on-action', bg: 'color.action.primary', min: TEXT },
  { fg: 'color.fg.on-action', bg: 'color.action.primary-hover', min: TEXT },
  { fg: 'color.fg.on-danger', bg: 'color.action.danger', min: TEXT },
  { fg: 'color.fg.on-danger', bg: 'color.action.danger-hover', min: TEXT },
  ...STATUSES.map((s) => ({ fg: `color.status.${s}.fg`, bg: `color.status.${s}.bg`, min: TEXT })),
  { fg: 'button.primary.fg', bg: 'button.primary.bg', min: TEXT },
  { fg: 'button.primary.fg', bg: 'button.primary.bg-hover', min: TEXT },
  { fg: 'button.secondary.fg', bg: 'button.secondary.bg', min: TEXT },
  { fg: 'button.secondary.fg', bg: 'button.secondary.bg-hover', min: TEXT },
  { fg: 'button.secondary.border', bg: 'button.secondary.bg', min: UI },
  { fg: 'button.ghost.fg', bg: 'button.ghost.bg-hover', min: TEXT },
  { fg: 'button.danger.fg', bg: 'button.danger.bg', min: TEXT },
  { fg: 'button.danger.fg', bg: 'button.danger.bg-hover', min: TEXT },
];

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
