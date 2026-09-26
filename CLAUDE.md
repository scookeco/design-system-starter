# Design system starter

Reference design system in which drift fails the build. See `README.md` for the full drift-control chain.

## Commands

```sh
npm run check          # tokens:check + manifest:check + typecheck + lint + test + test:rules + build + size. Must pass.
npm run tokens         # regenerate tokens.css, tokens.ts and the token usage map after editing tokens/ or any system CSS
npm run manifest       # regenerate llms.txt, llms-full.txt and design-system.manifest.json after changing exports, props, JSDoc, stories, usage docs, guides or the rules below
npm run size           # bundle size budgets (.size-limit.json) + tree-shaking check; needs npm run build first
npm run dev            # Storybook gallery
npm run test:visual    # screenshots + axe for every story, light and dark, plus the WCAG 2.2 checks (local baselines are gitignored)
npm run test:wcag22    # only the WCAG 2.2 story checks: target size, focus not obscured, accessible auth, consistent help
```

Work on a branch. Never commit to `main` directly.

## Repo map

- `tokens/`: DTCG source (primitive → semantic → component). The only place values live.
- `src/tokens/token-usage.json`: **generated** map of the tokens each component, primitive and layout reads (directly, through props, or through what it composes). Shown in the gallery's Tokens panel. Changing any system CSS or a token means `npm run tokens`, or the unit test and `tokens:check` fail.
- `src/styles/`: layer order (`index.css`), reset, base, utilities, and the **generated** `tokens.css`. Never edit the generated file.
- `src/primitives/`: Stack, Cluster, Grid, Center, Sidebar, Switcher, Cover, Frame, Box, Reel, Imposter, VisuallyHidden (token-typed props).
- `src/components/`: system components. With `src/primitives/`, the only code allowed to import `radix-ui`.
- `src/layouts/`: `AppShell` (every signed-in page), `PageLayout` (a page's nav · main · aside), `AuthLayout` (signed-out pages), `FocusedLayout` (multi-step tasks), `AssistantPanel` (an assistant in AppShell's `assistant` slot). Import components and primitives; nothing below imports them.
- `src/format/`: locale formatting over Intl (`LocaleProvider`, `useFormat`). Part of the system; exported from `src/index.ts`.
- `src/app/`: the **app layer** the examples use, NOT the design system: `api/` (client + zod schemas; every response is parsed at the boundary), `model/` (cache keys `[tenant, scope, resource, params]`, queries, named predicates, projections, named mutations, selection, `permissions.ts`), `session.tsx` (memberships, workspace switch, sign-out, `useCan`), `routing/` (route type, matcher, `RouteView`, `AppLink`), `url/` (`useUrlState`), `registries/` (field registry, `entities.ts`: entityType → fields), `mocks/` (MSW handlers, seeded db, story wiring). TanStack Query, zod and MSW are devDependencies and may only be imported here and in examples.
- `src/examples/`: **golden examples**, one per archetype: `ListPage` (table and `RecordBoard`, `SavedViews`), `RecordPage`, `CreateEditFlow`, `EntityPages` (schema-driven list, record and form for any entity config), `SettingsPage`, `SignInPage`, `SetupWizard`, `DashboardPage`, `ErrorPages` (404, 403, error); AI: `RecordCopilot`, `CreateWithAi`, `AiReviewChanges`, `AssistantChatPage` (sharing `AssistantTurns`). `ExampleShell` is the app's shell composition; `routes.tsx` is the route table and `App.tsx` assembles it. Data pages read and write through `src/app`.
- `src/index.ts`: public entry point. Consumer code imports from here only.
- `fixtures/violations/`: one deliberate violation per rule. Excluded from lint; checked by `npm run test:rules`.
- `tests/visual/fixtures/`: one story per WCAG 2.2 check that the check must fail (tags `check-fixture`, `expect:<check>`, `!dev`, `no-visual`).
- `docs/`: gallery-only pages. `foundations/` (rendered from the token source), `guides/`, and `usage/<Name>.usage.tsx`, the usage section of each component's Docs tab.

## Budgets and gallery tools

- `npm run check` ends with bundle budgets: library JS, library CSS and a single `import { Button }` (`.size-limit.json`), and a check that importing any one export pulls in only the units it composes. A budget fails when the library grows: find why before raising the limit, and raise it only in the change that needs it (README, "Bundle size budgets").
- Charts use `color.chart.*` only (categorical slots in order, sequential, diverging), never status colours, and never colour alone. The rules and numbers are on Foundations/Data visualisation.
- The gallery's Width toolbar shows layouts at narrow, medium and wide container widths; the Tokens panel lists what a component reads.

## Machine-readable docs

- Start from `llms.txt` (rules + a link per guide, component, primitive, layout and example). `llms-full.txt` has every usage doc and guide in full; `design-system.manifest.json` has every export's props, variants, stories, tokens and usage rules as data (schema beside it). Look a component up there before using it.
- All three are **generated** by `npm run manifest`; `manifest:check` fails when they are stale. Never edit them: fix the JSDoc, usage doc, story or guide they come from.
- The rules block below is the source for all three. Keep it between the `agent-rules` markers.

## Read the Guides first

Before building UI, read the **Guides** in the gallery (`docs/guides/`): Getting started, Principles, Decision ladder, Layout, Page archetypes, Data, Accessibility (and Accessibility conformance), Content, Forms, Motion, Theming and adding a brand, Escape hatches, Contributing and versioning, Testing, Agents, AI patterns. Look values up on the **Foundations** pages, not in `tokens/` by hand. Each component's Docs tab says when to use it and what to use instead.

## UI rules for coding agents

<!-- agent-rules:start (extracted into llms.txt, llms-full.txt and design-system.manifest.json: run npm run manifest after editing) -->
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
  without one. Lint, npm run check and the gallery (visual + axe + WCAG 2.2 checks) must pass.
- A story that renders an open modal is tagged ['modal-open', '!autodocs'].
- WCAG 2.2 AA is part of the gate: targets ≥ 24px or spaced (size.target-min),
  focus never hidden behind sticky content (scroll containers use
  space.scroll-padding.*), password fields as TextField type="password" with
  autoComplete (username, current-password or new-password, one-time-code),
  never block paste, pass AppShell's help from the shell composition, never
  ask twice in a multi-step flow, and any drag declares data-drag-alternative.
- Never add an eslint-disable or stylelint-disable without a reason after "--".
- Format every number, date, amount and list with useFormat() (LocaleProvider
  sets locale and time zone). Money is integer minor units + currency code.
- AI: render model output with StreamingText (never raw HTML), cite sources
  with Citation + SourcesList, mark unaccepted AI content with AiMarker, and
  never let AI write without ReviewChanges (or an explicit accept) and an Undo.
  The assistant acts only through the person's own can() and named mutations.
```
<!-- agent-rules:end -->

## Data rules (the app layer)

- The design system is UI-only: runtime `dependencies` stay exactly react, react-dom and radix-ui (a unit test enforces it). Never import msw, @tanstack/*, zod or `src/app` from `src/components`, `src/primitives` or `src/layouts` (lint enforces it, with fixtures).
- Pages never fetch or write the cache directly: read with the queries in `src/app/model/queries.ts`, write with one named mutation per domain verb in `src/app/model/mutations.ts`, and document what each patches and invalidates.
- Parse every response with its zod schema (`src/app/api/client.ts`); add the schema before the endpoint.
- "What counts as X" is one named predicate in `src/app/model/predicates.ts`, used by filters, counts, badges, guards and the mock server alike.
- View, search, filters, sort and page live in the URL (`useUrlState`): push for navigation, replace for refinements.
- New field types go in the field registry (`src/app/registries/fields.tsx`); new fields are config (`recordFields.ts`).
- Stories that read the mock API spread `mockApiMeta` and write `tags: ['!autodocs', 'data']` literally (Storybook reads tags statically); a story holding a request open adds `busy`; a story that queries nothing (a 403 or 404 route) removes it with `'!data'`. Server behaviour per story comes from `src/app/mocks/overrides.ts`; the role from `mockApi({ role })`. Don't put a doc comment on a story meta that spreads `mockApiMeta`: Storybook turns it into docs parameters that replace the spread ones.
- Records reference accounts and people by id. Show a name through `PersonRef`/`AccountRef` (or a `person`/`account` field), never a copied string.
- Keys lead with the partition (`usePartition()`: tenant, then permission scope). A record write patches its detail and every cached list page holding it (`patchListedRecord`), then invalidates.
- Permissions: capabilities in `CAPABILITIES`, roles mapped in `ROLE_CAPABILITIES` (the only place), one predicate `can`. Controls ask it (page actions disabled with a visible reason, menu items hidden), routes are guarded by it, every mutation refuses with it before sending, and every mock route declares its capability. Never branch on a role name.
- The assistant (`src/app/model/ai.ts`) has no grant of its own: requests refuse with `can` before sending, the mock reads with `canSee` and proposes only where `can` holds, and applying a proposal goes through the named mutations. Its answers are mutations, so the settled signal waits for a stream; pin other moments with the overrides in `src/app/mocks/ai.ts`.
- New screens are rows in `src/examples/routes.tsx` with a guard. A new entity that fits the list, record and form archetypes is an entry in `src/app/registries/entities.ts`.
