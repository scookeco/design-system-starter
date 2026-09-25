/**
 * Perceptual colour distance for chart palettes: OKLab, and colour-vision-deficiency simulation.
 *
 * - Distance is ΔE_OK: Euclidean distance in OKLab, multiplied by 100 (so 1 ≈ a just-noticeable
 *   difference, and the thresholds below read as whole numbers).
 * - CVD is simulated with Machado, Oliveira and Fernandes (2009) at severity 1.0, applied in
 *   linear sRGB. The thresholds are calibrated to that model, so the model is part of the rule.
 *
 * Pure (no file system): tests/unit/contrast.test.ts and the Foundations "Data visualisation"
 * page both run it.
 */
import { parseHex } from './contrast.ts';

export type Vision = 'normal' | 'protan' | 'deutan' | 'tritan';

const MACHADO: Record<Exclude<Vision, 'normal'>, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const linearRgb = (hex: string, vision: Vision): [number, number, number] => {
  const { r, g, b } = parseHex(hex);
  const rgb = [toLinear(r), toLinear(g), toLinear(b)] as [number, number, number];
  if (vision === 'normal') return rgb;
  const m = MACHADO[vision];
  const row = (i: number) => {
    const k = m[i] as [number, number, number];
    return clamp01(k[0] * rgb[0] + k[1] * rgb[1] + k[2] * rgb[2]);
  };
  return [row(0), row(1), row(2)];
};

/** OKLab [L, a, b] of a hex colour, optionally as seen with a colour-vision deficiency. */
export const oklab = (hex: string, vision: Vision = 'normal'): [number, number, number] => {
  const [r, g, b] = linearRgb(hex, vision);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/** OKLCH lightness (0–1) and chroma. */
export const oklch = (hex: string): { l: number; c: number; h: number } => {
  const [l, a, b] = oklab(hex);
  return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
};

/** ΔE_OK × 100 between two colours, as seen with the given vision. */
export const deltaE = (x: string, y: string, vision: Vision = 'normal'): number => {
  const p = oklab(x, vision);
  const q = oklab(y, vision);
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
