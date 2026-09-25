import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * The design system ships UI only. Its runtime dependencies are React and Radix, nothing else:
 * data fetching, caching, mocking and validation are the app's choice, so they stay
 * devDependencies used by src/app and the examples (ESLint keeps them out of the system's code).
 */
describe('package dependencies', () => {
  it('are exactly react, react-dom and radix-ui at runtime', () => {
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(['radix-ui', 'react', 'react-dom']);
    expect(pkg.peerDependencies).toBeUndefined();
  });

  it('keep the app layer’s data libraries in devDependencies', () => {
    for (const name of ['msw', 'msw-storybook-addon', '@tanstack/react-query', 'zod']) expect(pkg.devDependencies).toHaveProperty(name);
  });
});
