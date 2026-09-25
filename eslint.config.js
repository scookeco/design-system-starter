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

/** Code that consumes the system: the golden example and anything built like it. */
const CONSUMER = ['src/examples/**'];

// Vendor UI (headless or themed component libraries, icon sets) may only be imported inside
// src/components and src/primitives. Add any new vendor UI package to this group.
const VENDOR_UI = {
  group: ['radix-ui', 'radix-ui/*', '@radix-ui/*'],
  message: 'Vendor UI is wrapped by the design system. Import the system component from the public entry point instead.',
};
const SYSTEM_INTERNALS = {
  group: ['**/components/**', '**/primitives/**', '**/layouts/**', '**/internal/**', '**/tokens/**', '**/styles/**'],
  message: 'Import from the design system public entry point (src/index.ts), not its internals.',
};
const UPWARD_FROM_SYSTEM = {
  group: ['**/examples/**', '**/examples'],
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
// Layouts compose components and primitives. Vendor UI stays wrapped one layer down.
const LAYOUT_VENDOR_UI = {
  group: VENDOR_UI.group,
  message: 'Layouts compose system components and primitives. Wrap vendor UI in src/components or src/primitives first.',
};

const ESCAPE_HATCH = 'Escape hatch. Needs "// eslint-disable-next-line no-restricted-syntax -- <reason>; owner: <team>; remove when: <condition>". Prefer proposing a variant.';

export default defineConfig(
  {
    ignores: ['dist/**', 'storybook-static/**', 'fixtures/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'],
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
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: false }],
      'no-restricted-imports': ['error', { patterns: [VENDOR_UI] }],
    },
  },
  {
    name: 'system/components',
    files: ['src/components/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UPWARD_FROM_SYSTEM, CORE_TO_LAYOUT] }],
    },
  },
  {
    name: 'system/primitives',
    files: ['src/primitives/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UPWARD_FROM_SYSTEM, PRIMITIVE_TO_COMPONENT, CORE_TO_LAYOUT] }],
    },
  },
  {
    name: 'system/layouts',
    files: ['src/layouts/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [LAYOUT_VENDOR_UI, UPWARD_FROM_SYSTEM] }],
    },
  },
  {
    name: 'consumer',
    files: CONSUMER,
    rules: {
      'no-restricted-imports': ['error', { patterns: [VENDOR_UI, SYSTEM_INTERNALS] }],
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
