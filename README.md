# Design system starter

A small, working design system in which **drift fails the build**. Tokens, components, layout primitives, page layouts (app shell, page regions, signed-out and focused-task frames), a gallery and a golden example page per archetype. Every link from the token source to the rendered pixel is either generated from the link before it or checked by a machine. Nothing in the chain depends on someone remembering to review it.

Stack: npm (Node 24, pinned to an exact version in `.nvmrc`, which CI reads, so Intl locale data can't drift between runs), Vite 8, React 19, TypeScript 6 (strict), Radix primitives for behaviour, plain CSS with cascade layers over CSS custom properties, Style Dictionary 5, Storybook 10, Vitest, Playwright + axe, ESLint (flat config) and Stylelint. The examples' app layer adds TanStack Query, zod and MSW, as devDependencies only: the design system itself stays UI-only.

## Quick start

```sh
npm ci
npx playwright install chromium   # once, for the visual and a11y suite
npm run dev                       # Storybook on http://localhost:6006
npm run check                     # everything CI runs except the visual job
```

**First step after pushing a fresh clone:** GitHub only lets you dispatch a `workflow_dispatch` workflow once it exists on the default branch. Until Linux baselines exist, the CI visual job passes with a notice. It skips the screenshots, but axe still runs. So:

1. Open a PR for this starter and merge it into `main`. The visual job shows "No visual baselines yet".
2. Create a branch (for example `chore/visual-baselines`), push it, and run **Actions → Update visual baselines** on that branch. It commits `tests/visual/__screenshots__/linux/*.png` back to the branch. Use a branch rather than `main`, because a protected `main` rejects the bot's push.
3. Open a PR from that branch. If CI didn't start, push any commit or re-run it: a push made with `GITHUB_TOKEN` doesn't trigger CI. Merge once the visual job is green. From then on, any screenshot difference, or a new story with no baseline, fails the visual job.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Storybook dev server (the gallery). |
| `npm run tokens` | Build `src/styles/tokens.css` and `src/tokens/tokens.ts` from `tokens/**/*.json`, then the token usage map `src/tokens/token-usage.json`. |
| `npm run tokens:check` | Rebuild tokens to a temp dir and fail if the committed files or the token usage map are stale. |
| `npm run manifest` | Generate the files for coding agents from the code, stories, usage docs, guides and `CLAUDE.md`: `design-system.manifest.json`, `llms.txt` and `llms-full.txt`. |
| `npm run manifest:check` | Regenerate them in memory and fail if any committed one is stale. |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm run lint` | ESLint (`lint:js`) and Stylelint (`lint:css`), zero warnings allowed. |
| `npm test` | Vitest: token, contrast, CSS-structure and component tests. |
| `npm run test:rules` | Lints every file in `fixtures/violations/` and asserts that the expected rule fires. |
| `npm run build` | Library build (`dist/index.js`, `dist/styles.css`). |
| `npm run size` | Bundle size budgets (size-limit) and the tree-shaking check over `dist/`; run after `build`. |
| `npm run build-storybook` | Static gallery in `storybook-static/`. |
| `npm run test:visual` | Build Storybook, then screenshot and axe every story in light and dark, and run the WCAG 2.2 checks. |
| `npm run test:visual:update` | Rewrite this platform's baselines (local ones are gitignored). |
| `npm run test:wcag22` | Build Storybook, then only the WCAG 2.2 checks (target size, focus not obscured, accessible authentication, consistent help) and their fixtures. |
| `npm run check` | `tokens:check`, `manifest:check`, `typecheck`, `lint`, `test`, `test:rules`, `build`, `size`. |

## Repo map

```text
tokens/                 DTCG token source: primitive/ → semantic/ → component/
scripts/build-tokens.ts Style Dictionary build and --check mode
scripts/token-usage.ts  token usage map (src/tokens/token-usage.json) and --check mode
scripts/check-tree-shaking.ts  single-component imports pull in only what they compose
scripts/manifest.ts     the files for coding agents (manifest, llms.txt, llms-full.txt) and --check mode; collector in manifest-collect.ts
scripts/checks/         token, contrast, chart palette, token usage and CSS checks (used by Vitest)
scripts/test-rules.ts   proves every lint and type rule fires
scripts/eslint/         local ESLint rules (drag-needs-alternative)
src/styles/             index.css (layer order) · reset · generated tokens.css · base · utilities
src/tokens/tokens.ts    generated, typed var() map (semantic + component tiers)
src/tokens/token-usage.json  generated: tokens read by each component, primitive and layout (schema beside it)
src/primitives/         Stack, Cluster, Grid, Center, Sidebar, Switcher, Cover, Frame, Box, Reel, Imposter, VisuallyHidden
src/components/         the components; the only place (with primitives) Radix is imported
src/layouts/            AppShell (every signed-in page), PageLayout (a page's nav · main · aside), AuthLayout (signed out), FocusedLayout (multi-step tasks)
src/format/             locale formatting over Intl: LocaleProvider, useFormat (part of the system; no dependencies)
src/app/                the app layer the examples use (not the system): api/ (client, zod schemas), model/ (keys, queries,
                        predicates, projections, mutations, selection), url/ (useUrlState), registries/ (field registry), mocks/ (MSW)
src/internal/           closed-API helpers (Closed<>, UNSAFE_ escape hatch)
src/examples/           golden example pages, one per archetype (also a consumer lint target)
src/index.ts            public entry point
docs/                   Storybook-only pages: foundations/ (generated from the token source), guides/, usage/ (Docs tab sections); docs-only helpers in ui/
fixtures/violations/    one deliberate violation per rule; fixtures/clean/ = negative controls; fixtures/manifest/ = the manifest extractor's test entry
tests/unit/             Vitest suites
tests/visual/           Playwright suite: screenshots + axe, WCAG 2.2 checks (shared story opening in storybook.ts); __screenshots__/linux/ is committed
tests/visual/fixtures/  check-fixture stories that each WCAG 2.2 check must fail (hidden from the gallery)
.storybook/             gallery config, theme, width, locale, latency and failure toolbars, the Tokens panel (manager.tsx); public/ holds MSW's service worker
.size-limit.json        bundle size budgets
llms.txt, llms-full.txt, design-system.manifest.json   generated: the system for coding agents (schema: design-system.manifest.schema.json)
.github/workflows/      ci.yml, update-visual-baselines.yml
```

## The drift-control chain, as implemented

Drift gets in wherever something is copied by hand between two links. Each link here is generated from the one before it or checked by a machine, and every check fails the build.

| Link | Enforced by | Where |
|---|---|---|
| Token source (DTCG JSON) is the only place values live | `color-no-hex`, `color-named`, colour-function ban, strict token values, raw length/duration ban (Stylelint) | `stylelint.config.mjs` |
| Aliases resolve, tiers reference downward only, every semantic colour has a dark value | Vitest | `tests/unit/tokens.test.ts`, `scripts/checks/token-source.ts` |
| Semantic fg/bg pairs meet WCAG 2.2 AA (4.5:1 text, 3:1 UI) in light **and** dark | Vitest | `tests/unit/contrast.test.ts` |
| Chart colours: every mark 3:1 on every surface; adjacent categorical slots distinguishable with normal vision and colour-vision deficiency; ramps that stand out more at every step | Vitest, in light and dark | `tests/unit/contrast.test.ts`, `scripts/checks/chart-palette.ts` |
| Source → CSS variables + TS map | Style Dictionary build; `tokens:check` fails on stale output | `scripts/build-tokens.ts` |
| Every `var()` used is defined; system CSS never reads primitives; one layer order; every rule in a layer | Vitest | `tests/unit/css.test.ts`, `scripts/checks/css.ts` |
| The token usage map (and the gallery's Tokens panel) matches the stylesheets, TSX and token source | `tokens:check` and Vitest fail when it is stale or breaks its schema | `scripts/token-usage.ts`, `tests/unit/token-usage.test.ts`, `src/tokens/token-usage.schema.json` |
| Closed components: no `className`/`style` props | TypeScript props types (`Closed<>`), proved by a type fixture | `src/internal/closed-api.ts`, `fixtures/violations/typescript-closed-api.tsx` |
| Vendor UI only inside the system; consumers use the public entry | `no-restricted-imports` (ESLint) | `eslint.config.js` |
| Layers import downward only (see the layer table below) | `no-restricted-imports` per layer; `test:rules` needs a fixture for every direction | `eslint.config.js`, `scripts/test-rules.ts` |
| Media and container queries use breakpoint tokens (queries can't read `var()`, and Stylelint only checks declarations) | Vitest: every query length equals a `size.breakpoint.*` value | `tests/unit/css.test.ts` |
| The system is UI-only: runtime `dependencies` are exactly react, react-dom and radix-ui | Vitest | `tests/unit/dependencies.test.ts` |
| Data libraries (msw, TanStack Query, zod) and `src/app` never enter the system | `no-restricted-imports` in the components, primitives and layouts blocks; a fixture per boundary | `eslint.config.js`, `fixtures/violations/eslint-*-imports-data.tsx` |
| Only trusted data enters the cache: every API response is parsed with its zod schema | Vitest: an invalid payload becomes an error and the cache stays empty | `src/app/api/client.ts`, `tests/unit/api.test.ts` |
| Every field type has a registry entry; unknown types fall back and never throw | TypeScript (registry keyed on the union, proved with `@ts-expect-error`) and Vitest | `src/app/registries/fields.tsx`, `tests/unit/registry.test.tsx` |
| Escape hatches are visible | `no-restricted-syntax` flags `className`, `style` and `UNSAFE_*` in consumer code | `eslint.config.js` |
| Exceptions carry a reason | `eslint-comments/require-description`, unused disables are errors; Stylelint `reportDescriptionlessDisables` and `reportNeedlessDisables` | both configs |
| The rules are actually loaded | `test:rules` (every rule has a fixture, fixtures must not be ignored or fail to parse, clean controls must pass) | `scripts/test-rules.ts` |
| Gallery: every variant/size/state renders correctly in light and dark | Playwright screenshots against Linux baselines | `tests/visual/stories.spec.ts` |
| Gallery is accessible | axe (WCAG 2.2 A/AA) on every story, both themes | `tests/visual/stories.spec.ts` |
| WCAG 2.2 criteria axe doesn't decide: target size (2.5.8), focus not obscured by sticky content (2.4.11), accessible authentication (3.3.8), consistent help (3.2.6) | Playwright on every story, one light pass; each check proved by a fixture story that must fail it | `tests/visual/wcag22.spec.ts`, `tests/visual/wcag22-checks.ts`, `tests/visual/fixtures/` |
| Every drag has a single-pointer alternative (2.5.7) | `starter/drag-needs-alternative` (ESLint): `data-drag-alternative` on draggable elements and in files importing a drag-and-drop library | `scripts/eslint/drag-needs-alternative.js` |
| Sign-in works with a password manager and paste; wizards never ask twice (3.3.8, 3.3.7) | Vitest audits on the sign-in and wizard examples, with negative controls | `tests/unit/wcag22.test.tsx` |
| Every exported component, layout and primitive has a usage doc, attached to a story title, with every section filled and live examples that render | Vitest (matched by identity against `src/index.ts` exports, with negative controls) | `tests/unit/docs.test.tsx`, `scripts/checks/docs-coverage.ts` |
| Foundations show the real tokens and the tested contrast pairs | Generated from the token source through the checks' own model | `docs/foundations/`, `scripts/checks/token-model.ts`, `scripts/checks/contrast-pairs.ts` |
| Docs tabs are accessible | axe (WCAG 2.2 A/AA) on every Docs tab | `tests/visual/stories.spec.ts` |
| The library stays small, and one import doesn't pull in the rest | size-limit budgets; tree-shaking check per exported unit | `.size-limit.json`, `scripts/check-tree-shaking.ts` |
| Agents know the rules | UI rules block, extracted between markers into `llms.txt` and the manifest | `CLAUDE.md` |
| Agents see the system as it is: every export, prop, variant, story, token and usage rule | Generated from the code; `manifest:check` and Vitest fail when a file is stale, an export is missing, a component has no stories or tokens, or any props accept `className`/`style` | `scripts/manifest.ts`, `tests/unit/manifest.test.ts`, `design-system.manifest.schema.json` |

### Layers

Each layer imports only from the layers below it. Every arrow that is not allowed has a fixture in `fixtures/violations/`, and `test:rules` fails if one is missing.

| Layer | Folder | May import | Cascade layer |
|---|---|---|---|
| Examples (consumer code) | `src/examples/` | the public entry `src/index.ts` and `src/app`; no vendor UI, no `className`/`style` | none: no CSS |
| App layer (consumer code) | `src/app/` | the public entry, the data libraries (TanStack Query, zod, MSW); no vendor UI, no `className`/`style` | none: no CSS |
| Layouts | `src/layouts/` | components, primitives, tokens; no vendor UI, no examples, no `src/app`, no data libraries | `layouts` |
| Components | `src/components/` | other components, primitives, tokens, `src/format`, Radix; no layouts, no examples, no `src/app`, no data libraries | `components` |
| Formatting | `src/format/` | `Intl` only; no components, no data libraries | none: no CSS |
| Primitives | `src/primitives/` | other primitives, tokens; no components, no layouts, no data libraries | `primitives` |
| Tokens | `tokens/` → `src/styles/tokens.css`, `src/tokens/tokens.ts` | nothing | `tokens` |

### Rules worth knowing

- **Allowed literals** in token-only properties: `inherit`, `currentColor`, `transparent`, `none`, `auto`, `0`, `1px`, `100%`. Anything else is a token.
- **Transitions are written as longhands.** `transition-property` holds the property names; `transition-duration` and `transition-timing-function` take tokens. The shorthand is rejected because it mixes property names with values.
- **Component-local custom properties** (`--button-bg`) must point at a token (`var(--…)`) or an allowed keyword.
- **Component internals may use Flexbox/Grid.** Arranging a page is the layout primitives' job. This is the "less restrictive" policy. The golden examples have no CSS at all.
- **Escape hatch format.** In consumer code every `UNSAFE_className`/`UNSAFE_style` needs:
  ```tsx
  {/* eslint-disable-next-line no-restricted-syntax -- <reason>; owner: <team>; remove when: <condition> */}
  ```
  Count these disables. A rising count means drift, and a repeated override means a variant is missing.

## Bundle size budgets

`npm run size` (the last step of `npm run check`, so CI enforces it) measures the built library with [size-limit](https://github.com/ai/size-limit), minified and gzipped, with `react`, `react-dom` and `radix-ui` left out as the consumer's own dependencies:

| Budget | Limit | Measures |
|---|---|---|
| Library JS | 16.35 kB | `dist/index.js`, everything exported |
| Library CSS | 11.5 kB | `dist/styles.css` |
| One component | 1.5 kB | `import { Button }` from `dist/index.js`: what a consumer pays for one component |

It then runs `scripts/check-tree-shaking.ts`: for every unit with a public export, it bundles `import { <Export> }` from `dist/index.js` and fails if the output contains any component, primitive or layout other than that unit and the units it composes (`composesAll` in `src/tokens/token-usage.json`). A module-level side effect or a barrel import that drags in unrelated components fails here. The CSS is one stylesheet by design, so it has a budget but no tree-shaking.

**Changing a budget deliberately.** A failing budget means the library grew. First find out why: `dist/index.js` is not minified and marks each source module with a `//#region` comment, so diffing it against a build of `main` shows what grew. If the growth is intended (a new component, new tokens), raise the `limit` of that entry in `.size-limit.json` to the new size plus about 10% headroom, in the same pull request as the change, and say why in its description. Never raise a limit to make an unexplained increase pass, and lower it again when something is removed.

## Theming

Semantic colour tokens hold both values as `light-dark(light, dark)`. `:root` sets `color-scheme: light`, and `data-theme="dark"` on `<html>` switches to dark. Components contain no theme rules at all. The product ships light, and turning dark on is a one-line change. Contrast is tested in both themes, and the gallery captures both.

## What's in the system

| Kind | Parts |
|---|---|
| Layouts | `AppShell`: skip link, sidebar (brand + `Nav`) that collapses to a remembered icon rail, header (breadcrumbs, actions, help in the same place on every page, account menu), `main` as the only scrolling region, optional sticky action bar (focus scrolls clear of it), toast region; below `size.breakpoint.md` the nav opens in a `Drawer`. `PageLayout`: a page's section nav, main column and named aside, stacking below `size.breakpoint.sm`. `AuthLayout`: brand, one centred card and a footer for signed-out pages. `FocusedLayout`: a task header with an exit, one column and a sticky action bar for wizards. |
| Page structure | `PageHeader` (the page's h1, status, description, actions) |
| Navigation | `Nav` (grouped, `aria-current`, icon rail), `NavTabs` (sections as routes), `Breadcrumbs`, `Tabs` (panels in place), `Link` and `LinkProvider` (router adapter), `Pagination`, `Stepper`, `Menu` |
| Actions | `Button`, `Menu`, `SegmentedControl`, `Toggle`, `CopyButton` |
| Forms | `TextField` (a password gets a show-password toggle), `SearchField`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `FileUpload` (all share the `Field` anatomy and take an `id` for error-summary links) |
| Data display | `Table`, `Badge`, `Tag`, `Avatar`, `Card`, `Stat`, `Meter`, `Timeline`, `CodeBlock`, `Divider`, `Heading`, `Text` |
| Feedback and page states | `Banner`, `Toast`, `EmptyState`, `Spinner`, `Skeleton`, `Progress`, `Tooltip` |
| Overlays | `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip`, `HoverCard` |
| Layout primitives | `Stack`, `Cluster`, `Grid`, `Center`, `Sidebar`, `Switcher`, `Cover`, `Frame`, `Box`, `Reel`, `Imposter`, `VisuallyHidden` |
| Formatting | `LocaleProvider` (locale and time zone), `useFormat()` (date, time, relative time, number, percent, compact, money from integer minor units, list, file size), `createFormatter`, `currencyDigits` |

## Which example to copy

Signed-in pages render inside `AppShell` and fill its slots; they never rebuild the frame. Signed-out pages use `AuthLayout`, and focused multi-step tasks use `FocusedLayout`. Every page starts with a `PageHeader`. Copy the example for the archetype, not another screen.

| Archetype | Copy | It shows |
|---|---|---|
| List / index | `src/examples/ListPage.tsx` | PageHeader with one primary action, view tabs with server counts, SearchField and a Filters popover with removable chips, sortable table, pagination, all server-side and in the URL; row selection, "Select all N matching", a bulk bar and bulk delete with partial failure; loading (skeleton rows), first use, no results and load error; quick-create dialog, toast |
| Record / detail | `src/examples/RecordPage.tsx` | breadcrumb, PageHeader with status and a "More" menu, NavTabs (Overview · Activity · Files, previews in a Frame), properties aside rendered from the field registry; optimistic rename with rollback and a 409 conflict banner, pessimistic archive and delete; loading and error with the shell up |
| Create and edit | `src/examples/CreateEditFlow.tsx` | full-page form for a heavy record (fields from the field registry), quick-create dialog for a light one, errors on blur and submit, a focused error summary linking to fields, pending submit in a sticky action bar, a create that is safe to retry (idempotency key) |
| Settings | `src/examples/SettingsPage.tsx` | Personal and Workspace tiers in a grouped sub-nav (PageLayout's nav slot), one card per category with its own Save, a success banner |
| Sign-in | `src/examples/SignInPage.tsx` | AuthLayout; SSO first, an emailed sign-in link, a password as the secondary route; a failed-sign-in banner; a verification-code step |
| Wizard | `src/examples/SetupWizard.tsx` | FocusedLayout with an exit, Progress and Stepper; validation per step, focus to each step's h1; a review step with Edit |
| Dashboard | `src/examples/DashboardPage.tsx` | a date range (SegmentedControl) in the PageHeader, Stat tiles in a Switcher, usage Meters, recent activity, a needs-attention table |
| Error / 404 | `src/examples/ErrorPages.tsx` | a signed-in 404 inside the shell and a server error in AuthLayout: EmptyState as the h1, Try again, a way home |

`src/examples/ExampleShell.tsx` is the app's shell composition (one nav config, one account menu) that each page passes its location and content to. The list, record and create examples read and write through the app layer in `src/app` (below); `src/app/model/status.ts` holds the one status-to-tone map. `src/examples/records.ts` keeps a few static rows for the dashboard.

## Data: the app layer

The design system draws; `src/app` knows. It is consumer code, like the examples, and the system never imports it. The **Guides → Data** page in the gallery explains it in full.

- **One server cache** (TanStack Query) with keys `[tenant, resource, params]`. The tenant is in every key and every request.
- **Validate at the boundary.** Every response is parsed with a zod schema in `src/app/api/client.ts`; a bad payload becomes an error state and never reaches the cache.
- **Named predicates** (`isOpen`, `canDelete`, the view predicates) drive the filters, tab counts, badges, bulk guards and the mock server. Views are pure projections (`toRow`).
- **URL state** (`useUrlState`) for view, search, filters, sort and page: push for navigation, replace for refinements, debounced search.
- **One named mutation per verb** (`renameRecord` optimistic with rollback and 409 handling; `archiveRecord`, `createRecord` with an idempotency key, and `bulkDeleteRecords` pessimistic), each documenting what it patches and invalidates.
- **A typed field registry** renders record properties and form fields; exhaustive at compile time, with a runtime fallback that reports and never throws.
- **A mock API** (MSW) over a seeded database: 240 and 120 records for two tenants. The gallery's Latency and Failures toolbars change its behaviour, and failures are real 500 responses. The same handlers serve Vitest (`msw/node`).

## Adding a component: walk the decision ladder

Stop at the first yes:

1. **Is it a new page?** Copy the matching example (table above), render it inside `AppShell`, and compose existing parts. No new component.
2. **Does an existing component need a new look?** Add a **variant** (a new value in its closed `data-*` vocabulary, plus a story). A new status extends the status-to-tone map; it doesn't add a badge.
3. **Is it a genuinely new region or intent?** Add a **component** in `src/components/<Name>/`:
   - `Name.tsx`: props typed with `Closed<…>` (no `className`/`style`), a required accessible name, variants as closed unions, and state via aria/native attributes. Wrap Radix here if you need behaviour. Never expose `asChild`.
   - `Name.css`: inside `@layer components`, BEM-lite classes, in the order block, parts, variants, states. Tokens only.
   - `Name.stories.tsx`: one story per variant, size and state. The visual and axe suite picks them up automatically.
   - `docs/usage/Name.usage.tsx`: the usage section of its Docs tab (see Documentation below).
   - Export it from `src/components/index.ts`.
4. **A new primitive?** The highest bar: domain-agnostic, token-driven, impossible to express as a composition. It changes tokens, component styles and `CLAUDE.md` in the same PR.

Then run `npm run check`, run the baseline workflow on the branch, and review the new screenshots in the PR diff.

## Adding a token

1. Pick the tier. **Semantic** is almost always right (`color.fg.muted`, `space.gap.md`). Add a **primitive** only for a new raw value. Add a **component** token only when one part needs its own override hook.
2. Edit `tokens/<tier>/*.json` (DTCG: `$type`, `$value`, aliases as `{path.to.token}`). Keys are lowercase kebab-case. A semantic colour needs `"$extensions": { "starter.modes": { "dark": "{…}" } }`.
3. `npm run tokens`, and commit the JSON together with the regenerated `src/styles/tokens.css` and `src/tokens/tokens.ts`.
4. If it is a new text/background pair, add it to `scripts/checks/contrast-pairs.ts` (tested in `tests/unit/contrast.test.ts`, shown on Foundations/Colour).
   A chart colour goes in `tokens/semantic/chart.json`; if it adds a slot or step, extend the lists in `scripts/checks/chart-palette.ts`, which the contrast test and Foundations/Data visualisation read.
5. Removing or renaming a semantic token is a breaking change. Keep an alias for a deprecation window.

## Gallery tooling

- **Theme toolbar**: light or dark, on `<html>`, so portalled overlays follow it.
- **Width toolbar**: wraps any story in a container of narrow (half of `size.breakpoint.sm`), medium (`sm`), wide (`md`) or full width. Layouts respond to their container, so this shows each responsive state inside the fixed viewport. Full, the default, renders no wrapper, so screenshots are unaffected.
- **Tokens panel**: for the current component, primitive or layout story, every token it reads, in its own CSS, through a prop (`gap="md"` → `space.gap.md`) or through the units it composes, with the token's tier, alias chain (semantic → primitive) and light and dark values. It renders `src/tokens/token-usage.json`, which `npm run tokens` generates and `tokens:check` keeps current. Content a caller passes in (an AppShell's nav, a Card's body) is the caller's, so it isn't listed. The JSON is documented by `src/tokens/token-usage.schema.json`, for tools that need a machine-readable map.

## Documentation

The gallery is the documentation. Everything in it is rendered from the system, so it can't describe a system that no longer exists.

| Section | Where | What |
|---|---|---|
| **Foundations** | `docs/foundations/` | Colour, data visualisation (chart palettes with their contrast and distances), typography, spacing/sizing/radius, breakpoints and layout grid, elevation and motion, layers (which units use each z tier, from the token usage map), focus and target size, icons. Names come from the generated `vars` map, and samples paint with each token's `var()` from `tokens.css`, except colour swatches, which paint with values resolved from the source so light and dark can sit side by side; values, dark values, "use for" notes (`$description`) and contrast ratios come from the token source through `scripts/checks/token-model.ts` and the shared pairs in `scripts/checks/contrast-pairs.ts`, the same code the tests run. |
| **Guides** | `docs/guides/` | Getting started, principles, the decision ladder, layout, page archetypes, data, accessibility, accessibility conformance (what's automated, what needs a person, how to run it), an accessibility statement template, content, forms, motion, theming and adding a brand, escape hatches, contributing and versioning, testing, and agents (how coding agents use llms.txt and the manifest). |
| **Docs tab** of every component, layout and primitive | `docs/usage/<Name>.usage.tsx` | When to use, when not to (and what instead), live do/don't examples built from the system, accessibility notes. `.storybook/DocsPage.tsx` renders it above the props table and stories. `<Name>` is the last segment of the story title. |

- Foundations and Guides pages are stories, so they get screenshots and axe in both themes like any other story.
- **Docs can't fall behind the API.** `tests/unit/docs.test.tsx` fails when an export from `src/index.ts` has no usage doc (parts such as `TableRow` are listed in their parent's `covers`), and renders every do/don't example. The usage docs and Guides are linted as consumer code: no `className`, `style` or `UNSAFE_` props.
- **Docs tabs render light only.** Storybook draws the docs page in its own light theme, so the theme toolbar applies to the Canvas tab only. The visual suite runs axe (not screenshots) on every Docs tab.
- **Stories tagged `modal-open` also carry `'!autodocs'`**, and Examples, Foundations and Guides opt out of the Docs tab: an open modal inline on a Docs tab would cover the page. An open non-modal overlay (Popover) carries only `'!autodocs'`: the page behind stays reachable, so axe needs no relaxation.
- `.storybook/preview.tsx` loads the docs page lazily. A static import pulls component stylesheets into chunks that load before the preview's CSS, which declares `@layer components` before the layer order and lets the reset win.

## For coding agents

Three generated files at the repo root describe the system to coding agents. `npm run manifest` writes them from the code; nothing in them is written by hand. The gallery's **Guides/Agents** page says how an agent should use them.

| File | What it holds | Read it |
|---|---|---|
| `llms.txt` | The [llms.txt](https://llmstxt.org) entry point: name, summary, the agent rules block, then one line per guide, foundation page, component, primitive, layout, utility and golden example, linking to its file with a short description (examples by title). Kept under 16 KB by a test. | whole, at the start of every session |
| `llms-full.txt` | The same, plus every unit's props, variants, states, usage doc (with the do and don't code), stories and tokens, every guide flattened to Markdown, and every semantic token with light and dark values. | when an agent takes a whole document as context |
| `design-system.manifest.json` | The same facts as data, documented by `design-system.manifest.schema.json`: every public export (component, primitive, layout, utility or type-only) with its source, JSDoc, props (TypeScript type, required, default, description, allowed values), closed-API facts, variants, states, usage rules, story ids, composition and tokens read; every semantic and component token; guides, foundations and examples; the rules; the commands. | for tools and targeted lookups (`jq`) |

Where the facts come from:

- **Exports and props**: the TypeScript compiler API over `src/index.ts`, so a new export appears on the next run. Own and third-party (Radix) props are listed one by one; React's DOM attribute interfaces are named in `inherits`, not expanded. Defaults come from the component's parameter destructuring.
- **Descriptions**: the JSDoc on the export; a unit without one falls back to the first "when to use" line of its usage doc. Improve the JSDoc or the usage doc, never the generated files.
- **Stories**: Storybook's own CSF parser over every `*.stories.tsx`, so the ids match the gallery.
- **Usage rules, guides**: the usage docs are imported and the guides rendered (in a Vite SSR server), then flattened to Markdown.
- **Tokens and composition**: `src/tokens/token-usage.json` and the token source. **Rules**: `CLAUDE.md` between the `agent-rules` markers. **Commands**: this README's Scripts table.

**Staleness.** `npm run manifest:check` (part of `npm run check`) regenerates all three in memory and fails if any committed file differs, so a change to an export, a prop or its JSDoc, a story, a usage doc, a guide, the token usage map, the rules block or the Scripts table must commit the regenerated files with it. `tests/unit/manifest.test.ts` also checks the schema, that every public export is listed, that every component, primitive and layout has stories, tokens and a usage doc, that no props accept `className`/`style`, that no absolute path leaks, that every link resolves, and the `llms.txt` budget.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

| Job | Runs | What it does |
|---|---|---|
| Check (tokens, types, lint, tests, rules, build) | always | `npm run check` |
| Detect UI changes | always | `dorny/paths-filter` sets `ui` when anything that can change a pixel or an axe result changed: `src/**`, `docs/**`, `tokens/**`, `scripts/checks/**` (the Foundations pages import them), `.storybook/**`, `CLAUDE.md` (the Agents guide shows its rules block), `tests/visual/**`, `playwright.config.ts`, `package.json`, `package-lock.json`, `.nvmrc` or the workflow itself |
| Build Storybook | push to `main`, or a ready (non-draft) pull request where `ui` changed | builds `storybook-static/` once and uploads it as an artifact |
| Visual regression and axe (1/4) … (4/4) | same as Build Storybook | four parallel shards (`npx playwright test --shard=N/4`, `fail-fast: false`) over the same artifact, running every spec: screenshots, axe and the WCAG 2.2 checks; each shard uploads its own report on failure |
| Visual regression and axe | always | the gate: passes when every shard passed, or when the shards were skipped (a draft, or nothing visual changed) |

- **Drafts while iterating.** Open pull requests as drafts: they run the check job only. Mark the pull request ready for review to run visual and axe (`ready_for_review` triggers it), and merge only once that ready run is green.
- **Superseded runs are cancelled.** A new push to a pull request cancels the run it replaces; runs on `main` are never cancelled.
- **Require the gate, not the shards, in branch protection.** A matrix job skipped by its `if` never expands, so a check named "(1/4)" would never report.
- **Keep the `ui` filter complete.** Anything new that feeds the gallery (a folder of stories, a script the gallery imports) goes into the filter in the same change, or pull requests that touch only it skip the visual job.
- The **Update visual baselines** workflow is deliberately not sharded: it rewrites every Linux baseline in one commit.

## Visual baselines

- Screenshots live at `tests/visual/__screenshots__/{platform}/<story-id>--<theme>.png`. Only `linux/` is committed. It is produced by the **Update visual baselines** workflow on `ubuntu-24.04`, the same image CI compares on.
- Without Docker you can't produce Linux baselines locally, and that's fine. Locally, `npm run test:visual:update` writes `darwin/` baselines (gitignored) so you can diff your own changes before pushing.
- In CI, `updateSnapshots: 'none'` applies. While no Linux baselines exist, screenshot tests skip with a notice (each shard reports it). Once any exist, a story without a baseline fails, and so does any pixel difference.
- After an intended visual change: run the workflow on your branch, re-run CI, and review the updated PNGs in the PR.
- Stories tagged `no-visual` get no screenshot and no axe run. Only the WCAG 2.2 check fixtures use it: they are deliberate violations.
- **Data stories are deterministic.** Every Playwright spec (screenshots, axe and the WCAG 2.2 checks) opens stories through `openStory` in `tests/visual/storybook.ts`, which opens every story with `latency:0;failure:0` in its globals, freezes the page clock at the instant the mock data was seeded for (`SEED_EPOCH`), and waits for `html[data-queries-settled="true"]` on stories tagged `data`. A story that holds a request open on purpose is tagged `busy` and isn't waited on. Each story gets a fresh mock database and a fresh cache.
- Stories tagged `modal-open` (open Dialog, Drawer, Select or Menu) relax only axe's `aria-hidden-focus`. Radix hides the page behind a focus-trapped modal layer, and axe can't see the trap.

## Deliberately not included yet

| Not yet | Add it when |
|---|---|
| **Figma Variables sync check** (export variables via the REST API or Tokens Studio, diff against `tokens/`, fail on unexplained differences) | A designer works in Figma alongside the code. Until then the JSON is the only source. |
| **Versioned package publishing** (semver, changelog, changesets, deprecation windows) | A second app consumes the system. Until then it's one folder in one repo. |
| **Codemods** for breaking changes (jscodeshift/ts-morph) | You ship a breaking change to more than one consumer. |
| **Adoption scanning** (system vs local components, `UNSAFE_` uses, disable counts per app) | A second team builds on the system and you need system-coverage numbers. |
| **Phone tab bar** | Phones become a primary surface. Until then the narrow-screen nav opens in a Drawer. |
| **Chart components** | A page needs a trend, not just a number. Until then dashboards use Stat, Meter and tables. The chart colour tokens and their rules already exist (Foundations/Data visualisation), so a chart library or hand-drawn SVG reads `color.chart.*` from day one. |
| **Multi-brand / tenant token axis** (`data-brand` remapping primitives beside `color-scheme`) | A second brand or tenant arrives. Brand becomes another mode on the semantic tier, and the contrast and visual matrix run per brand × scheme. |

## Versions and compromises

- **TypeScript is pinned to 6.0.x.** `typescript-eslint` supports `<6.1`, so TypeScript 7 has to wait for it.
- **jsdom is on 29.** jsdom 30 requires Node ≥ 24.15.
- Layout primitives take no `ref`. The polymorphic `as` prop makes that costly to type, and layout wrappers rarely need one.
