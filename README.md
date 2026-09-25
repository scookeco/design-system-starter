# Design system starter

A small, working design system in which **drift fails the build**. Tokens, components, layout primitives, page layouts (app shell, page regions, signed-out and focused-task frames), a gallery and a golden example page per archetype. Every link from the token source to the rendered pixel is either generated from the link before it or checked by a machine. Nothing in the chain depends on someone remembering to review it.

Stack: npm (Node 24), Vite 8, React 19, TypeScript 6 (strict), Radix primitives for behaviour, plain CSS with cascade layers over CSS custom properties, Style Dictionary 5, Storybook 10, Vitest, Playwright + axe, ESLint (flat config) and Stylelint.

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
| `npm run tokens` | Build `src/styles/tokens.css` and `src/tokens/tokens.ts` from `tokens/**/*.json`. |
| `npm run tokens:check` | Rebuild tokens to a temp dir and fail if the committed files are stale. |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm run lint` | ESLint (`lint:js`) and Stylelint (`lint:css`), zero warnings allowed. |
| `npm test` | Vitest: token, contrast, CSS-structure and component tests. |
| `npm run test:rules` | Lints every file in `fixtures/violations/` and asserts that the expected rule fires. |
| `npm run build` | Library build (`dist/index.js`, `dist/styles.css`). |
| `npm run build-storybook` | Static gallery in `storybook-static/`. |
| `npm run test:visual` | Build Storybook, then screenshot and axe every story in light and dark. |
| `npm run test:visual:update` | Rewrite this platform's baselines (local ones are gitignored). |
| `npm run check` | `tokens:check`, `typecheck`, `lint`, `test`, `test:rules`, `build`. |

## Repo map

```text
tokens/                 DTCG token source: primitive/ → semantic/ → component/
scripts/build-tokens.ts Style Dictionary build and --check mode
scripts/checks/         token, contrast and CSS checks (used by Vitest)
scripts/test-rules.ts   proves every lint and type rule fires
src/styles/             index.css (layer order) · reset · generated tokens.css · base · utilities
src/tokens/tokens.ts    generated, typed var() map (semantic + component tiers)
src/primitives/         Stack, Cluster, Grid, Center, Sidebar, Switcher, Cover, Frame
src/components/         the components; the only place (with primitives) Radix is imported
src/layouts/            AppShell (every signed-in page), PageLayout (a page's nav · main · aside), AuthLayout (signed out), FocusedLayout (multi-step tasks)
src/internal/           closed-API helpers (Closed<>, UNSAFE_ escape hatch)
src/examples/           golden example pages, one per archetype (also a consumer lint target)
src/index.ts            public entry point
docs/                   Storybook-only pages: foundations/ (generated from the token source), guides/, usage/ (Docs tab sections); docs-only helpers in ui/
fixtures/violations/    one deliberate violation per rule; fixtures/clean/ = negative controls
tests/unit/             Vitest suites
tests/visual/           Playwright suite; __screenshots__/linux/ is committed
.storybook/             gallery config, theme toolbar
.github/workflows/      ci.yml, update-visual-baselines.yml
```

## The drift-control chain, as implemented

Drift gets in wherever something is copied by hand between two links. Each link here is generated from the one before it or checked by a machine, and every check fails the build.

| Link | Enforced by | Where |
|---|---|---|
| Token source (DTCG JSON) is the only place values live | `color-no-hex`, `color-named`, colour-function ban, strict token values, raw length/duration ban (Stylelint) | `stylelint.config.mjs` |
| Aliases resolve, tiers reference downward only, every semantic colour has a dark value | Vitest | `tests/unit/tokens.test.ts`, `scripts/checks/token-source.ts` |
| Semantic fg/bg pairs meet WCAG 2.2 AA (4.5:1 text, 3:1 UI) in light **and** dark | Vitest | `tests/unit/contrast.test.ts` |
| Source → CSS variables + TS map | Style Dictionary build; `tokens:check` fails on stale output | `scripts/build-tokens.ts` |
| Every `var()` used is defined; system CSS never reads primitives; one layer order; every rule in a layer | Vitest | `tests/unit/css.test.ts`, `scripts/checks/css.ts` |
| Closed components: no `className`/`style` props | TypeScript props types (`Closed<>`), proved by a type fixture | `src/internal/closed-api.ts`, `fixtures/violations/typescript-closed-api.tsx` |
| Vendor UI only inside the system; consumers use the public entry | `no-restricted-imports` (ESLint) | `eslint.config.js` |
| Layers import downward only (see the layer table below) | `no-restricted-imports` per layer; `test:rules` needs a fixture for every direction | `eslint.config.js`, `scripts/test-rules.ts` |
| Media and container queries use breakpoint tokens (queries can't read `var()`, and Stylelint only checks declarations) | Vitest: every query length equals a `size.breakpoint.*` value | `tests/unit/css.test.ts` |
| Escape hatches are visible | `no-restricted-syntax` flags `className`, `style` and `UNSAFE_*` in consumer code | `eslint.config.js` |
| Exceptions carry a reason | `eslint-comments/require-description`, unused disables are errors; Stylelint `reportDescriptionlessDisables` and `reportNeedlessDisables` | both configs |
| The rules are actually loaded | `test:rules` (every rule has a fixture, fixtures must not be ignored or fail to parse, clean controls must pass) | `scripts/test-rules.ts` |
| Gallery: every variant/size/state renders correctly in light and dark | Playwright screenshots against Linux baselines | `tests/visual/stories.spec.ts` |
| Gallery is accessible | axe (WCAG 2.2 A/AA) on every story, both themes | `tests/visual/stories.spec.ts` |
| Every exported component, layout and primitive has a usage doc, attached to a story title, with every section filled and live examples that render | Vitest (matched by identity against `src/index.ts` exports, with negative controls) | `tests/unit/docs.test.tsx`, `scripts/checks/docs-coverage.ts` |
| Foundations show the real tokens and the tested contrast pairs | Generated from the token source through the checks' own model | `docs/foundations/`, `scripts/checks/token-model.ts`, `scripts/checks/contrast-pairs.ts` |
| Docs tabs are accessible | axe (WCAG 2.2 A/AA) on every Docs tab | `tests/visual/stories.spec.ts` |
| Agents know the rules | UI rules block | `CLAUDE.md` |

### Layers

Each layer imports only from the layers below it. Every arrow that is not allowed has a fixture in `fixtures/violations/`, and `test:rules` fails if one is missing.

| Layer | Folder | May import | Cascade layer |
|---|---|---|---|
| Examples (consumer code) | `src/examples/` | the public entry `src/index.ts` only; no vendor UI, no `className`/`style` | none: no CSS |
| Layouts | `src/layouts/` | components, primitives, tokens; no vendor UI, no examples | `layouts` |
| Components | `src/components/` | other components, primitives, tokens, Radix; no layouts, no examples | `components` |
| Primitives | `src/primitives/` | other primitives, tokens; no components, no layouts | `primitives` |
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
| Library JS | 12 kB | `dist/index.js`, everything exported |
| Library CSS | 11.5 kB | `dist/styles.css` |
| One component | 1.5 kB | `import { Button }` from `dist/index.js`: what a consumer pays for one component |

It then runs `scripts/check-tree-shaking.ts`: for every unit with a public export, it bundles `import { <Export> }` from `dist/index.js` and fails if the output contains any component, primitive or layout other than that unit and the units it composes (`composesAll` in `src/tokens/token-usage.json`). A module-level side effect or a barrel import that drags in unrelated components fails here. The CSS is one stylesheet by design, so it has a budget but no tree-shaking.

**Changing a budget deliberately.** A failing budget means the library grew. First find out why: `dist/index.js` is not minified and marks each source module with a `//#region` comment, so diffing it against a build of `main` shows what grew. If the growth is intended (a new component, new tokens), raise the `limit` of that entry in `.size-limit.json` to the new size plus about 15% headroom, in the same pull request as the change, and say why in its description. Never raise a limit to make an unexplained increase pass, and lower it again when something is removed.

## Theming

Semantic colour tokens hold both values as `light-dark(light, dark)`. `:root` sets `color-scheme: light`, and `data-theme="dark"` on `<html>` switches to dark. Components contain no theme rules at all. The product ships light, and turning dark on is a one-line change. Contrast is tested in both themes, and the gallery captures both.

## What's in the system

| Kind | Parts |
|---|---|
| Layouts | `AppShell`: skip link, sidebar (brand + `Nav`) that collapses to a remembered icon rail, header (breadcrumbs, actions, account menu), `main` as the only scrolling region, optional sticky action bar, toast region; below `size.breakpoint.md` the nav opens in a `Drawer`. `PageLayout`: a page's section nav, main column and named aside, stacking below `size.breakpoint.sm`. `AuthLayout`: brand, one centred card and a footer for signed-out pages. `FocusedLayout`: a task header with an exit, one column and a sticky action bar for wizards. |
| Page structure | `PageHeader` (the page's h1, status, description, actions) |
| Navigation | `Nav` (grouped, `aria-current`, icon rail), `NavTabs` (sections as routes), `Breadcrumbs`, `Tabs` (panels in place), `Link` and `LinkProvider` (router adapter), `Pagination`, `Stepper`, `Menu` |
| Actions | `Button`, `Menu`, `SegmentedControl` |
| Forms | `TextField`, `SearchField`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch` (all share the `Field` anatomy and take an `id` for error-summary links) |
| Data display | `Table`, `Badge`, `Tag`, `Avatar`, `Card`, `Stat`, `Meter`, `Heading`, `Text` |
| Feedback and page states | `Banner`, `Toast`, `EmptyState`, `Spinner`, `Skeleton`, `Progress`, `Tooltip` |
| Overlays | `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip` |
| Layout primitives | `Stack`, `Cluster`, `Grid`, `Center`, `Sidebar`, `Switcher`, `Cover`, `Frame` |

## Which example to copy

Signed-in pages render inside `AppShell` and fill its slots; they never rebuild the frame. Signed-out pages use `AuthLayout`, and focused multi-step tasks use `FocusedLayout`. Every page starts with a `PageHeader`. Copy the example for the archetype, not another screen.

| Archetype | Copy | It shows |
|---|---|---|
| List / index | `src/examples/ListPage.tsx` | PageHeader with one primary action, SearchField and a Filters popover with removable chips, sortable table, pagination; loading (skeleton rows), first use, no results and load error; quick-create dialog, toast |
| Record / detail | `src/examples/RecordPage.tsx` | breadcrumb, PageHeader with status and a "More" menu, NavTabs (Overview · Activity · Files, previews in a Frame), properties aside in PageLayout; loading and error with the shell up |
| Create and edit | `src/examples/CreateEditFlow.tsx` | full-page form for a heavy record, quick-create dialog for a light one, errors on blur and submit, a focused error summary linking to fields, pending submit in a sticky action bar |
| Settings | `src/examples/SettingsPage.tsx` | Personal and Workspace tiers in a grouped sub-nav (PageLayout's nav slot), one card per category with its own Save, a success banner |
| Sign-in | `src/examples/SignInPage.tsx` | AuthLayout; SSO first, an emailed sign-in link, a password as the secondary route; a failed-sign-in banner; a verification-code step |
| Wizard | `src/examples/SetupWizard.tsx` | FocusedLayout with an exit, Progress and Stepper; validation per step, focus to each step's h1; a review step with Edit |
| Dashboard | `src/examples/DashboardPage.tsx` | a date range (SegmentedControl) in the PageHeader, Stat tiles in a Switcher, usage Meters, recent activity, a needs-attention table |
| Error / 404 | `src/examples/ErrorPages.tsx` | a signed-in 404 inside the shell and a server error in AuthLayout: EmptyState as the h1, Try again, a way home |

`src/examples/ExampleShell.tsx` is the app's shell composition (one nav config, one account menu) that each page passes its location and content to. `src/examples/records.ts` holds the shared example domain, including the one status-to-tone map.

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
5. Removing or renaming a semantic token is a breaking change. Keep an alias for a deprecation window.

## Documentation

The gallery is the documentation. Everything in it is rendered from the system, so it can't describe a system that no longer exists.

| Section | Where | What |
|---|---|---|
| **Foundations** | `docs/foundations/` | Colour, typography, spacing/sizing/radius, elevation and motion, icons. Names come from the generated `vars` map, and samples paint with each token's `var()` from `tokens.css`, except colour swatches, which paint with values resolved from the source so light and dark can sit side by side; values, dark values, "use for" notes (`$description`) and contrast ratios come from the token source through `scripts/checks/token-model.ts` and the shared pairs in `scripts/checks/contrast-pairs.ts`, the same code the tests run. |
| **Guides** | `docs/guides/` | Getting started, principles, the decision ladder, layout, page archetypes, accessibility, content, escape hatches. |
| **Docs tab** of every component, layout and primitive | `docs/usage/<Name>.usage.tsx` | When to use, when not to (and what instead), live do/don't examples built from the system, accessibility notes. `.storybook/DocsPage.tsx` renders it above the props table and stories. `<Name>` is the last segment of the story title. |

- Foundations and Guides pages are stories, so they get screenshots and axe in both themes like any other story.
- **Docs can't fall behind the API.** `tests/unit/docs.test.tsx` fails when an export from `src/index.ts` has no usage doc (parts such as `TableRow` are listed in their parent's `covers`), and renders every do/don't example. The usage docs and Guides are linted as consumer code: no `className`, `style` or `UNSAFE_` props.
- **Docs tabs render light only.** Storybook draws the docs page in its own light theme, so the theme toolbar applies to the Canvas tab only. The visual suite runs axe (not screenshots) on every Docs tab.
- **Stories tagged `modal-open` also carry `'!autodocs'`**, and Examples, Foundations and Guides opt out of the Docs tab: an open modal inline on a Docs tab would cover the page. An open non-modal overlay (Popover) carries only `'!autodocs'`: the page behind stays reachable, so axe needs no relaxation.
- `.storybook/preview.tsx` loads the docs page lazily. A static import pulls component stylesheets into chunks that load before the preview's CSS, which declares `@layer components` before the layer order and lets the reset win.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

| Job | Runs | What it does |
|---|---|---|
| Check (tokens, types, lint, tests, rules, build) | always | `npm run check` |
| Detect UI changes | always | `dorny/paths-filter` sets `ui` when anything that can change a pixel or an axe result changed: `src/**`, `docs/**`, `tokens/**`, `scripts/checks/**` (the Foundations pages import them), `.storybook/**`, `tests/visual/**`, `playwright.config.ts`, `package.json`, `package-lock.json` or the workflow itself |
| Build Storybook | push to `main`, or a ready (non-draft) pull request where `ui` changed | builds `storybook-static/` once and uploads it as an artifact |
| Visual regression and axe (1/4) … (4/4) | same as Build Storybook | four parallel shards (`npx playwright test --shard=N/4`, `fail-fast: false`) over the same artifact; each shard uploads its own report on failure |
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
- Stories tagged `modal-open` (open Dialog, Drawer, Select or Menu) relax only axe's `aria-hidden-focus`. Radix hides the page behind a focus-trapped modal layer, and axe can't see the trap.

## Deliberately not included yet

| Not yet | Add it when |
|---|---|
| **Figma Variables sync check** (export variables via the REST API or Tokens Studio, diff against `tokens/`, fail on unexplained differences) | A designer works in Figma alongside the code. Until then the JSON is the only source. |
| **Versioned package publishing** (semver, changelog, changesets, deprecation windows) | A second app consumes the system. Until then it's one folder in one repo. |
| **Codemods** for breaking changes (jscodeshift/ts-morph) | You ship a breaking change to more than one consumer. |
| **Adoption scanning** (system vs local components, `UNSAFE_` uses, disable counts per app) | A second team builds on the system and you need system-coverage numbers. |
| **Phone tab bar** | Phones become a primary surface. Until then the narrow-screen nav opens in a Drawer. |
| **Charts** | A page needs a trend, not just a number. Until then dashboards use Stat, Meter and tables. |
| **Multi-brand / tenant token axis** (`data-brand` remapping primitives beside `color-scheme`) | A second brand or tenant arrives. Brand becomes another mode on the semantic tier, and the contrast and visual matrix run per brand × scheme. |

## Versions and compromises

- **TypeScript is pinned to 6.0.x.** `typescript-eslint` supports `<6.1`, so TypeScript 7 has to wait for it.
- **jsdom is on 29.** jsdom 30 requires Node ≥ 24.15.
- Layout primitives take no `ref`. The polymorphic `as` prop makes that costly to type, and layout wrappers rarely need one.
