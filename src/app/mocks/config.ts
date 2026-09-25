/**
 * How the mock server behaves: how long it takes and how often it fails. The gallery's Latency
 * and Failure toolbars set these; the visual suite pins both to 0 so screenshots never depend on
 * timing or chance. Tests set them directly.
 *
 * Kept free of imports on purpose: Storybook's preview reads it, and the preview must not pull in
 * system code (see .storybook/preview.tsx).
 */
export const mockConfig = {
  /** Delay before every response, in milliseconds. */
  latencyMs: 0,
  /** Chance, 0–1, that a request fails with a real 500 response. */
  failureRate: 0,
  /** Where the failure roll comes from. Math.random by default; tests make it deterministic. */
  random: Math.random,
};

export type MockConfig = typeof mockConfig;

export const configureMocks = (next: Partial<MockConfig>) => Object.assign(mockConfig, next);
