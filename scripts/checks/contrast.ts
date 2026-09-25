/** WCAG 2.2 relative luminance and contrast ratio for hex colours (#rgb, #rrggbb, #rrggbbaa). */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const parseHex = (hex: string): Rgba => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) / 255 : 1 };
};

/** Composite a translucent foreground over an opaque background. */
const over = (fg: Rgba, bg: Rgba): Rgba => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = ({ r, g, b }: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (foreground: string, background: string): number => {
  const bg = parseHex(background);
  if (bg.a < 1) throw new Error(`Background ${background} must be opaque`);
  const fg = over(parseHex(foreground), bg);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
