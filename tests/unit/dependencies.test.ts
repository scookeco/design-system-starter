import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * The design system ships UI only. Its runtime dependencies are React, Radix and React Aria, nothing
 * else: data fetching, caching, mocking and validation are the app's choice, so they stay
 * devDependencies used by src/app and the examples (ESLint keeps them out of the system's code).
 *
 * React Aria (react-aria-components) is there for Combobox, MultiSelect, DatePicker,
 * DateRangePicker and NumberField only, wrapped like the Radix parts. @internationalized/date is
 * its own date library (already one of its dependencies, at the same range, so it dedupes): the
 * pickers need it to turn ISO date strings into its date values, and it is not re-exported.
 */
describe('package dependencies', () => {
  it('are exactly react, react-dom, radix-ui and react-aria-components (with its date library) at runtime', () => {
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(['@internationalized/date', 'radix-ui', 'react', 'react-aria-components', 'react-dom']);
    expect(pkg.peerDependencies).toBeUndefined();
  });

  it('pin the date library to the range react-aria-components itself asks for, so it dedupes', () => {
    const rac = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../node_modules/react-aria-components/package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies?.['@internationalized/date']).toBe(rac.dependencies['@internationalized/date']);
  });

  it('keep the app layer’s data libraries in devDependencies', () => {
    for (const name of ['msw', 'msw-storybook-addon', '@tanstack/react-query', 'zod']) expect(pkg.devDependencies).toHaveProperty(name);
  });
});
