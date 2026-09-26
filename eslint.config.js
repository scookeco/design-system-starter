/**
 * ESLint: import boundaries, the closed styling API and disable hygiene.
 * Every rule is an error. Each has a deliberate violation in fixtures/violations/
 * and `npm run test:rules` proves it still fires.
 */
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import starter from './scripts/eslint/drag-needs-alternative.js';

/**
 * Code that consumes the system: the golden examples and anything built like them, including
 * the usage docs' live do/don't examples and the Guides pages, which must not restyle either.
 */
const CONSUMER = ['src/examples/**', 'src/app/**', 'docs/usage/*.usage.tsx', 'docs/guides/**'];

// Vendor UI (headless or themed component libraries, icon sets) may only be imported inside
// src/components and src/primitives. Add any new vendor UI package to this group.
const VENDOR_UI = {
  group: ['radix-ui', 'radix-ui/*', '@radix-ui/*'],
  message: 'Vendor UI is wrapped by the design system. Import the system component from the public entry point instead.',
};
// React Aria (react-aria-components, for comboboxes, date pickers and number fields) and its date
// library may only be imported inside src/components: not in primitives, layouts, src/format or
// consumer code. Its own building blocks (react-aria, react-stately, @react-aria/*, …) are
// transitive dependencies, not ours, so they are banned everywhere, components included.
const REACT_ARIA = {
  group: ['react-aria-components', 'react-aria-components/*', '@internationalized/*'],
  message: 'React Aria is wrapped by system components in src/components only. Import the system component (Combobox, DatePicker, NumberField…) from the public entry point.',
};
const REACT_ARIA_INTERNALS = {
  group: ['react-aria', 'react-aria/*', 'react-stately', 'react-stately/*', '@react-aria/*', '@react-stately/*', '@react-types/*'],
  message: 'Transitive React Aria packages are not dependencies of the system. Use react-aria-components (inside src/components) instead.',
};
const SYSTEM_INTERNALS = {
  group: ['**/components/**', '**/primitives/**', '**/layouts/**', '**/internal/**', '**/tokens/**', '**/styles/**', '**/format/**'],
  message: 'Import from the design system public entry point (src/index.ts), not its internals.',
};
const UPWARD_FROM_SYSTEM = {
  group: ['**/examples/**', '**/examples', '**/app/**', '**/app'],
  message: 'The design system never imports consumer code.',
};
const PRIMITIVE_TO_COMPONENT = {
  group: ['**/components/**', '**/components'],
  message: 'Layout primitives sit below components: they may import tokens and other primitives only.',
};
const CORE_TO_LAYOUT = {
  group: ['**/layouts/**', '**/layouts'],
  message: 'Layouts sit above components and primitives: the system core never imports a layout.',
};
// The design system is UI-only. Data fetching, caching, mocking and schema validation belong to the
// app layer (src/app) and the examples; add any new data library to this group.
const DATA_LIBRARIES = {
  group: ['msw', 'msw/*', 'msw-storybook-addon', 'msw-storybook-addon/*', '@tanstack/*', 'zod', 'zod/*'],
  message: 'The design system is UI-only: data libraries (msw, TanStack Query, zod) belong to the app layer in src/app.',
};
// Layouts compose components and primitives. Vendor UI stays wrapped one layer down.
const LAYOUT_VENDOR_UI = {
  group: VENDOR_UI.group,
  message: 'Layouts compose system components and primitives. Wrap vendor UI in src/components or src/primitives first.',
};

// Each layer below or beside components gets its own message, so test:rules can tell the boundaries apart.
const PRIMITIVE_REACT_ARIA = {
  group: REACT_ARIA.group,
  message: 'Layout primitives are layout, not behaviour: React Aria is wrapped in src/components only.',
};
const LAYOUT_REACT_ARIA = {
  group: REACT_ARIA.group,
  message: 'Layouts compose system components: wrap React Aria in src/components first.',
};
const FORMAT_REACT_ARIA = {
  group: REACT_ARIA.group,
  message: 'src/format is the one formatting system (Intl): date pickers read it through useFormat(), never the other way round.',
};

const ESCAPE_HATCH = 'Escape hatch. Needs "// eslint-disable-next-line no-restricted-syntax -- <reason>; owner: <team>; remove when: <condition>". Prefer proposing a variant.';

export default defineConfig(
  {
    // .storybook/public holds MSW's generated service worker, which is not ours to lint.
    ignores: ['dist/**', 'storybook-static/**', 'fixtures/**', 'playwright-report/**', 'test-results/**', 'node_modules/**', '.storybook/public/**'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },
  js.configs.recommended,
  tseslint.configs.strict,
  comments.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks, starter },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // WCAG 2.2 SC 2.5.7: every drag declares its single-pointer alternative.
      'starter/drag-needs-alternative': 'error',
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: false }],
      'no-restricted-imports': ['error', { patterns: [VENDOR_UI, REACT_ARIA, REACT_ARIA_INTERNALS] }],
    },
  },
  {
    name: 'system/components',
    files: ['src/components/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UPWARD_FROM_SYSTEM, CORE_TO_LAYOUT, DATA_LIBRARIES, REACT_ARIA_INTERNALS] }],
    },
  },
  {
    name: 'system/format',
    files: ['src/format/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UPWARD_FROM_SYSTEM, CORE_TO_LAYOUT, DATA_LIBRARIES, FORMAT_REACT_ARIA, REACT_ARIA_INTERNALS] }],
    },
  },
  {
    name: 'system/primitives',
    files: ['src/primitives/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UPWARD_FROM_SYSTEM, PRIMITIVE_TO_COMPONENT, CORE_TO_LAYOUT, DATA_LIBRARIES, PRIMITIVE_REACT_ARIA, REACT_ARIA_INTERNALS] }],
    },
  },
  {
    name: 'system/layouts',
    files: ['src/layouts/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [LAYOUT_VENDOR_UI, UPWARD_FROM_SYSTEM, DATA_LIBRARIES, LAYOUT_REACT_ARIA, REACT_ARIA_INTERNALS] }],
    },
  },
  {
    name: 'consumer',
    files: CONSUMER,
    rules: {
      'no-restricted-imports': ['error', { patterns: [VENDOR_UI, REACT_ARIA, REACT_ARIA_INTERNALS, SYSTEM_INTERNALS] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name=/^UNSAFE_/]',
          message: `UNSAFE_ prop: ${ESCAPE_HATCH}`,
        },
        {
          selector: 'JSXAttribute[name.name="className"]',
          message: 'Consumer code does not style: compose system components and layout primitives. Need a new look? Propose a variant.',
        },
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'Consumer code does not style: compose system components and layout primitives. Need a new look? Propose a variant.',
        },
      ],
    },
  },
);
