import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
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
