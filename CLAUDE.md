# Design system starter

Reference design system in which drift fails the build. See `README.md` for the full drift-control chain.

## Commands

```sh
npm run check          # tokens:check + typecheck + lint + test + test:rules + build + size. Must pass.
npm run tokens         # regenerate tokens.css, tokens.ts and the token usage map after editing tokens/ or any system CSS
npm run size           # bundle size budgets (.size-limit.json) + tree-shaking check; needs npm run build first
npm run dev            # Storybook gallery
npm run test:visual    # screenshots + axe for every story, light and dark (local baselines are gitignored)
```

Work on a branch. Never commit to `main` directly.

## Repo map

- `tokens/`: DTCG source (primitive → semantic → component). The only place values live.
- `src/tokens/token-usage.json`: **generated** map of the tokens each component, primitive and layout reads (directly, through props, or through what it composes). Shown in the gallery's Tokens panel. Changing any system CSS or a token means `npm run tokens`, or the unit test and `tokens:check` fail.
- `src/styles/`: layer order (`index.css`), reset, base, utilities, and the **generated** `tokens.css`. Never edit the generated file.
- `src/primitives/`: Stack, Cluster, Grid, Center, Sidebar, Switcher, Cover, Frame (token-typed props).
- `src/components/`: system components. With `src/primitives/`, the only code allowed to import `radix-ui`.
- `src/layouts/`: `AppShell` (every signed-in page), `PageLayout` (a page's nav · main · aside), `AuthLayout` (signed-out pages), `FocusedLayout` (multi-step tasks). Import components and primitives; nothing below imports them.
- `src/examples/`: **golden examples**, one per archetype: `ListPage`, `RecordPage`, `CreateEditFlow`, `SettingsPage`, `SignInPage`, `SetupWizard`, `DashboardPage`, `ErrorPages`. `ExampleShell` is the app's shell composition; `records.ts` the example domain.
- `src/index.ts`: public entry point. Consumer code imports from here only.
- `fixtures/violations/`: one deliberate violation per rule. Excluded from lint; checked by `npm run test:rules`.
- `docs/`: gallery-only pages. `foundations/` (rendered from the token source), `guides/`, and `usage/<Name>.usage.tsx`, the usage section of each component's Docs tab.

## Budgets and gallery tools

- `npm run check` ends with bundle budgets: library JS, library CSS and a single `import { Button }` (`.size-limit.json`), and a check that importing any one export pulls in only the units it composes. A budget fails when the library grows: find why before raising the limit, and raise it only in the change that needs it (README, "Bundle size budgets").
- Charts use `color.chart.*` only (categorical slots in order, sequential, diverging), never status colours, and never colour alone. The rules and numbers are on Foundations/Data visualisation.
- The gallery's Width toolbar shows layouts at narrow, medium and wide container widths; the Tokens panel lists what a component reads.

## Read the Guides first

Before building UI, read the **Guides** in the gallery (`docs/guides/`): Getting started, Principles, Decision ladder, Layout, Page archetypes, Accessibility, Content, Escape hatches. Look values up on the **Foundations** pages, not in `tokens/` by hand. Each component's Docs tab says when to use it and what to use instead.

## UI rules for coding agents

```text
UI rules (design system v0)
- Style only with semantic tokens. No hex, rgb, px, ms or other raw values;
  allowed literals are inherit, currentColor, transparent, none, auto, 0, 1px, 100%.
- Compose system components and layout primitives, imported from src/index.ts.
  Never import radix-ui outside src/components or src/primitives.
- Never restyle a system component with className or style. Need a new look?
  Propose a variant. UNSAFE_className / UNSAFE_style are escape hatches that need
  a lint disable with a reason, an owner and a removal condition.
- Before creating a component, walk the decision ladder: template → variant →
  component → primitive. Stop at the first yes.
- Missing token? Add a semantic token in tokens/ (with a dark value for colours),
  run npm run tokens. Never write a literal instead.
- New pages start from PageHeader (the one h1, status, actions) inside the right
  layout: AppShell for signed-in pages (fill its slots; never rebuild the frame),
  AuthLayout for signed-out pages, FocusedLayout for multi-step tasks; PageLayout
  for a page's sub-nav or aside. Copy the matching golden example: list → ListPage,
  record → RecordPage, create/edit → CreateEditFlow, settings → SettingsPage,
  sign-in → SignInPage, wizard → SetupWizard, dashboard → DashboardPage,
  error/404 → ErrorPages. Not other screens.
- Links go through Link (or Nav, NavTabs, Breadcrumbs); the app injects its router
  once with LinkProvider. NavTabs for sections that are routes, Tabs for panels in place.
- CSS: inside a declared @layer, BEM-lite classes, logical properties only,
  variants as closed data-* attributes, state via aria/native attributes,
  specificity ≤ 0,3,0, no !important, no ids.
- Every new variant, size or state gets a story. Every new exported component,
  layout or primitive gets a usage doc in docs/usage/<Name>.usage.tsx (when to
  use, when not to, do/don't, accessibility); tests/unit/docs.test.tsx fails
  without one. Lint, npm run check and the gallery (visual + axe) must pass.
- A story that renders an open modal is tagged ['modal-open', '!autodocs'].
- Never add an eslint-disable or stylelint-disable without a reason after "--".
```
