import type { ReactNode } from 'react';

/** A live example rendered from system parts. Render functions, not elements: Storybook deep-merges parameters. */
export interface UsageExample {
  /** One sentence: what the example shows and why it is right (or wrong). */
  caption: string;
  render: () => ReactNode;
}

/**
 * The usage section of a component's Docs tab. One file per public component, layout or
 * primitive in docs/usage/<Name>.usage.tsx, where <Name> is the last segment of its story title.
 * tests/unit/docs.test.ts fails if an export from src/index.ts is not covered by one.
 *
 * Strings may mark code with `backticks`.
 */
export interface UsageDoc {
  /** The public exports this doc covers: the component and every part exported with it. */
  covers: readonly unknown[];
  /** When to reach for it. */
  whenToUse: readonly string[];
  /** When not to, and what to use instead. */
  whenNotToUse: readonly { situation: string; instead: string }[];
  do: UsageExample;
  dont: UsageExample;
  /** What the component guarantees, and what the caller still owns. */
  accessibility: readonly string[];
}
