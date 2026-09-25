/**
 * Stylelint: the token-value, logical-property and specificity gate.
 * Every rule is an error. Each one has a deliberate violation in fixtures/violations/
 * and `npm run test:rules` proves it still fires.
 */

// The only literals allowed where a token is expected.
const LITERALS = ['inherit', 'currentColor', 'currentcolor', 'transparent', 'none', 'auto', '0', '1px', '100%'];
// Border and outline shorthands also carry a line style keyword.
const LINE_STYLES = ['solid', 'dashed', 'dotted'];

// Properties whose values must come from tokens.
const BORDER_PROPERTIES = '/^(border|outline)(-(block|inline)(-(start|end))?)?(-color)?$/';
const TOKEN_ONLY_PROPERTIES = [
  '/^color$/',
  '/^background(-color)?$/',
  BORDER_PROPERTIES,
  '/^(fill|stroke)$/',
  '/^padding/',
  '/^margin/',
  '/^((row|column)-)?gap$/',
  '/radius$/',
  '/^box-shadow$/',
  '/^z-index$/',
  // Shorthands are included on purpose: write transition-property plus token durations and easings.
  '/^(transition|animation)(-duration|-delay|-timing-function)?$/',
  '/^font(-size|-family)?$/',
];

// A bare length or duration anywhere (other than 0 and 1px) is a missing token.
const RAW_LENGTH_OR_DURATION = String.raw`/(^|[\s(,/])(?!1px\b)-?\d*\.?\d+(px|rem|em|ch|vw|vh|dvh|svh|lh|ms|s)\b/`;

// BEM-lite: block, block__part, block--modifier (kebab-case, no abbreviations enforced by review).
const BEM_LITE = '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$';

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-declaration-strict-value', 'stylelint-use-logical'],
  ignoreFiles: ['src/styles/tokens.css', 'dist/**', 'storybook-static/**', 'fixtures/**'],
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  defaultSeverity: 'error',
  rules: {
    'scale-unlimited/declaration-strict-value': [
      TOKEN_ONLY_PROPERTIES,
      {
        ignoreValues: Object.fromEntries(
          TOKEN_ONLY_PROPERTIES.map((p) => [p, p === BORDER_PROPERTIES ? [...LITERALS, ...LINE_STYLES] : LITERALS]),
        ),
        ignoreVariables: true,
        ignoreFunctions: false,
        expandShorthand: false,
        disableFix: true,
        message: 'Use a token (var(--…)) for "${property}", not "${value}". Allowed literals: ' + LITERALS.join(', '),
      },
    ],
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix', 'light-dark'],
      { message: 'Colour functions belong in the token source. Use a semantic colour token.' },
    ],
    'declaration-property-value-disallowed-list': [
      { '/^(?!--).*/': [RAW_LENGTH_OR_DURATION] },
      { message: 'Raw lengths and durations are not allowed (except 0 and 1px). Use a token.' },
    ],
    'declaration-property-value-allowed-list': [
      { '/^--/': ['/var\\(--/', '/^(transparent|currentcolor|none|auto|0)$/'] },
      { message: 'Local custom properties must point at a token with var(--…), never a literal.' },
    ],
    'declaration-no-important': true,
    'selector-max-id': 0,
    'selector-max-specificity': '0,3,0',
    'max-nesting-depth': 2,
    'csstools/use-logical': ['always', { except: [] }],
    'selector-class-pattern': [BEM_LITE, { message: 'Class names are BEM-lite: .block, .block__part, .block--modifier' }],
    'custom-property-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
    // Layers are declared once in src/styles/index.css; component files wrap themselves in a named layer.
    'at-rule-no-unknown': true,
  },
};
