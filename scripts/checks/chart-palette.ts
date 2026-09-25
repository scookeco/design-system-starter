/**
 * The chart palette rules: which tokens make up each palette, and the measurable checks they
 * must pass in every theme. tests/unit/contrast.test.ts runs them; Foundations/Data visualisation
 * shows the same numbers. Pure: callers pass a resolver from token path to hex.
 *
 * Distance is ΔE_OK (OKLab × 100) from ./color-distance.ts; contrast is WCAG 2.2 from ./contrast.ts.
 */
import { deltaE, oklch } from './color-distance.ts';
import { contrastRatio } from './contrast.ts';
import { UI } from './contrast-pairs.ts';

export const CATEGORICAL = Array.from({ length: 8 }, (_, i) => `color.chart.categorical.${String(i + 1)}`);
export const SEQUENTIAL = Array.from({ length: 5 }, (_, i) => `color.chart.sequential.${String(i + 1)}`);
/** Low to high: the midpoint sits in the middle. */
export const DIVERGING = ['below-2', 'below-1', 'midpoint', 'above-1', 'above-2'].map((k) => `color.chart.diverging.${k}`);
export const CHART_TOKENS = [...CATEGORICAL, ...SEQUENTIAL, ...DIVERGING];

/** Every chart mark is checked against every surface a chart can sit on. */
export const CHART_SURFACES = ['color.bg.canvas', 'color.bg.surface', 'color.bg.subtle', 'color.bg.elevated'];

/**
 * The thresholds, in one place.
 * - MARK_CONTRAST: WCAG 2.2 SC 1.4.11, graphical objects: every mark 3:1 against the surface.
 * - ADJACENT_NORMAL: neighbouring categorical slots at least ΔE_OK 15 apart with normal vision.
 * - ADJACENT_CVD: and at least 8 apart under simulated protanopia and deuteranopia
 *   (Machado 2009, severity 1.0), the two most common colour-vision deficiencies.
 * - MIN_CHROMA: a categorical colour keeps OKLCH chroma ≥ 0.10, or it reads as grey.
 * - RAMP_STEP_L: sequential and diverging steps differ by at least 0.05 OKLCH lightness, so
 *   neighbouring steps are told apart by lightness alone (which survives every CVD and greyscale).
 * - NEUTRAL_CHROMA: the diverging midpoint stays neutral (chroma ≤ 0.05), so it reads as "neither".
 */
export const RULES = {
  MARK_CONTRAST: UI,
  ADJACENT_NORMAL: 15,
  ADJACENT_CVD: 8,
  MIN_CHROMA: 0.1,
  RAMP_STEP_L: 0.05,
  NEUTRAL_CHROMA: 0.05,
} as const;

export type Resolve = (path: string) => string;

export interface AdjacentPair {
  a: string;
  b: string;
  normal: number;
  protan: number;
  deutan: number;
}

/** Distances between each categorical slot and the next. */
export const adjacentPairs = (paths: readonly string[], resolve: Resolve): AdjacentPair[] =>
  paths.slice(1).map((b, i) => {
    const a = paths[i] as string;
    const [x, y] = [resolve(a), resolve(b)];
    return { a, b, normal: deltaE(x, y), protan: deltaE(x, y, 'protan'), deutan: deltaE(x, y, 'deutan') };
  });

/** Lowest contrast of a colour against all chart surfaces. */
export const minSurfaceContrast = (path: string, resolve: Resolve): number =>
  Math.min(...CHART_SURFACES.map((bg) => contrastRatio(resolve(path), resolve(bg))));

const f = (n: number) => n.toFixed(2);

export const categoricalProblems = (paths: readonly string[], resolve: Resolve): string[] => [
  ...adjacentPairs(paths, resolve).flatMap((p) => [
    ...(p.normal < RULES.ADJACENT_NORMAL ? [`${p.a} / ${p.b}: ΔE ${f(p.normal)} < ${String(RULES.ADJACENT_NORMAL)} (normal vision)`] : []),
    ...(Math.min(p.protan, p.deutan) < RULES.ADJACENT_CVD
      ? [`${p.a} / ${p.b}: ΔE ${f(Math.min(p.protan, p.deutan))} < ${String(RULES.ADJACENT_CVD)} (protanopia/deuteranopia)`]
      : []),
  ]),
  ...paths.filter((p) => oklch(resolve(p)).c < RULES.MIN_CHROMA).map((p) => `${p}: chroma ${f(oklch(resolve(p)).c)} < ${String(RULES.MIN_CHROMA)}`),
];

/**
 * A ramp that must stand out more from the surface at every step (sequential low → high; each
 * diverging arm from the midpoint outwards): contrast against every surface strictly increases,
 * and lightness moves by at least RAMP_STEP_L in one direction.
 */
export const rampProblems = (paths: readonly string[], resolve: Resolve): string[] => {
  const problems: string[] = [];
  for (let i = 1; i < paths.length; i += 1) {
    const [a, b] = [paths[i - 1] as string, paths[i] as string];
    for (const bg of CHART_SURFACES) {
      const [ca, cb] = [contrastRatio(resolve(a), resolve(bg)), contrastRatio(resolve(b), resolve(bg))];
      if (cb <= ca) problems.push(`${b} does not stand out more than ${a} on ${bg} (${f(cb)} ≤ ${f(ca)})`);
    }
    const dl = Math.abs(oklch(resolve(b)).l - oklch(resolve(a)).l);
    if (dl < RULES.RAMP_STEP_L) problems.push(`${a} → ${b}: lightness step ${dl.toFixed(3)} < ${String(RULES.RAMP_STEP_L)}`);
  }
  return problems;
};

/** The diverging scale: a neutral midpoint, and each arm a ramp outwards from it. */
export const divergingProblems = (paths: readonly string[], resolve: Resolve): string[] => {
  const mid = Math.floor(paths.length / 2);
  const midpoint = paths[mid] as string;
  const chroma = oklch(resolve(midpoint)).c;
  return [
    ...(chroma > RULES.NEUTRAL_CHROMA ? [`${midpoint}: chroma ${f(chroma)} > ${String(RULES.NEUTRAL_CHROMA)}, not neutral`] : []),
    ...rampProblems(paths.slice(mid + 1), resolve),
    ...rampProblems(paths.slice(0, mid).reverse(), resolve),
    ...categoricalProblems([paths[mid - 1] as string, midpoint, paths[mid + 1] as string], resolve).filter((p) => p.includes('normal vision')),
  ];
};
