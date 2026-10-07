# Design system starter

A small, working design system in which **drift fails the build**. Tokens, components, layout primitives, page layouts (app shell, page regions, signed-out and focused-task frames), a gallery and a golden example page per archetype. Every link from the token source to the rendered pixel is either generated from the link before it or checked by a machine. Nothing in the chain depends on someone remembering to review it.

Stack: npm (Node 24, pinned to an exact version in `.nvmrc`, which CI reads, so Intl locale data can't drift between runs), Vite 8, React 19, TypeScript 6 (strict), Radix primitives for behaviour (React Aria Components for comboboxes, date pickers and number fields), plain CSS with cascade layers over CSS custom properties, Style Dictionary 5, Storybook 10, Vitest, Playwright + axe, ESLint (flat config) and Stylelint. The examples' app layer adds TanStack Query, zod and MSW, as devDependencies only: the design system itself stays UI-only.

## Quick start

```sh
npm ci
npx playwright install chromium   # once, for the visual and a11y suite
npm run dev                       # Storybook on http://localhost:6006
npm run dev:app                   # the app itself on http://localhost:5173, on the mock API
npm run check                     # everything CI runs except the visual job
```

**First step after pushing a fresh clone:** GitHub only lets you dispatch a `workflow_dispatch` workflow once it exists on the default branch. Until Linux baselines exist, the CI visual job passes with a notice. It skips the screenshots, but axe still runs. So:

1. Open a PR for this starter and merge it into `main`. The visual job shows "No visual baselines yet".
2. Create a branch (for example `chore/visual-baselines`) and generate the Linux baselines. With Docker: `npm run test:visual:docker -- --full`, then commit them. Without it: push the branch and run **Actions → Update visual baselines** on it with **full** ticked; it commits them (then re-run CI, unless a `BASELINES_TOKEN` secret is set; see Visual baselines). Use a branch rather than `main`, because a protected `main` rejects the bot's push.
3. Open a PR from that branch, and merge once the visual job is green. From then on, any screenshot difference, or a new story with no baseline, fails the visual job.

## Start a new portal

This repo is a GitHub template. A portal is a **one-time copy** made with **Use this template**: nothing flows back from the starter afterwards, so the copy is yours to trim. Trimming means deleting what the portal doesn't need. Every check keeps working afterwards and tells you what else to edit. The gallery has the same steps in brief: **Guides → Start a new portal**.

### 1. Create the repository

1. On GitHub, **Use this template → Create a new repository**.
2. **Settings → General → Pull Requests**: allow **squash merging** only, and untick merge commits and rebase merging.
3. **Settings → Actions → General**: allow actions. The workflows ask for their own token permissions, so leave the default workflow permissions as they are.
4. Clone it. Before your first commit, set the repo's commit email to your GitHub noreply address. It's listed under **Settings → Emails** on your account, where you can also turn on **Keep my email addresses private** and **Block command line pushes that expose my email**:
   ```sh
   git config user.email "<id>+<username>@users.noreply.github.com"
   npm ci
   npx playwright install chromium
   npm run check
   ```

### 2. Rename

1. In `package.json`, set `name` and `description`, then run `npm install --package-lock-only` so the lockfile's name follows.
2. Change the first heading of this README and of `CLAUDE.md`. The manifest reads its name from the README heading and its summary from the `description`.
3. For the brand colours, follow **Guides → Theming and adding a brand**:
   - add the ramp to `tokens/primitive/color.json`;
   - point the brand-carrying tokens in `tokens/semantic/color.json` at it (the guide lists them);
   - run `npm run tokens`;
   - run `npm test`, which checks every pair for contrast in both schemes.
4. The demo workspace names ("Acme", "Globex" in `src/app/workspaces.ts`, and the `brand` on the signed-out pages) are sample data. Replace them when you build your pages.
5. Run `npm run manifest`, then `npm run check`.

### 3. Trim the examples

Delete one example at a time, and run the loop after each:

1. **Delete the files.** Remove `src/examples/<Name>.tsx` and `<Name>.stories.tsx`, plus the extra files the table below lists.
2. **Delete the routes.** Remove the example's rows from `src/examples/routes.tsx`. Each group has a comment naming it.
3. **Run `npm run typecheck`.** It names every file that still imports what you deleted. A test file named after the example goes whole. In a shared test file, delete only the `describe` blocks for that example.
4. **Run `npx vitest run`.** The checks name the rest:
   - `routes.test.tsx` lists links that now lead nowhere: nav items in `ExampleShell.tsx`, `GO_KEYS` and `PALETTE_ACTIONS` in `CommandMenu.tsx`, and `HOME` in `routes.tsx`.
   - `story-links.test.ts` lists guide links to the deleted stories. Add the example's title id (for example `'examples-inbox'`) to `REMOVED_EXAMPLES` in `docs/ui/removedExamples.ts`. Those links then render as plain text, and Page archetypes says the example isn't in this repo.
   - `repo-docs.test.ts` lists lines in this README and in `CLAUDE.md` that name deleted files, or tell agents to copy a deleted example. Edit or delete those lines.
   - `manifest.test.ts`: run `npm run manifest`.
5. **Run `npm run lint`** for imports left unused, usually icons.
6. **Run `npm run dead-modules`** (also part of `npm run check`). It names every module under `src/` and `docs/` that nothing reaches any more, which after a trim is what only the deleted example imported. Delete them, then run steps 3 to 5 again. After the AI examples it names `src/app/url/chatState.ts`; after `ReportsPage`, `src/app/api/reports.ts` and `src/app/model/reports.ts`; after `SearchPage`, `src/app/model/workspaceSearch.ts`.

| Delete | Also delete | Also edit |
|---|---|---|
| AI examples: `RecordCopilot`, `CreateWithAi`, `AiReviewChanges`, `AssistantChatPage` | `AssistantTurns.tsx`, `ai-examples.test.tsx` | Nothing else. Optionally drop the rest of the assistant's app layer too. In `src/app`, that's `api/ai.ts`, `model/ai.ts` and `mocks/ai.ts` (and `aiHandlers` in `mocks/handlers.ts`). In the tests, that's `ai.test.tsx`, the assistant's verbs and its 429 test in `telemetry.test.tsx`, and the `asRead` test in `writeQueue.test.tsx`. |
| `InboxPage`, `AdminConsole` | their `describe` blocks in `b2b.test.tsx` | the Inbox and Admin nav items; `g i`, `g m` and "Invite member" in `CommandMenu.tsx`. Keep `src/app/mocks/b2b.ts`: every write's audit event goes through it. |
| `ImportWizard` | `imports.test.tsx` | the "Import records" palette action |
| `SearchPage` | `search.test.tsx` | the palette's "See all results" row (`searchHref`) |
| `NotificationsPage` | `Notifications.tsx` (the bell), `notifications.test.tsx` | `NotificationsIndicator` and `notificationsOpen` in `ExampleShell.tsx` |
| `ReportsPage` | `charts.tsx`, `reports.test.tsx` | the Reports nav item |
| `IntegrationsPage`, `BillingPage` | `integrations.test.tsx`, `billing.test.tsx` | nothing else |
| `DashboardPage` | `Onboarding.tsx` and its stories, `records.ts`, `onboarding.test.tsx` | point `/` and `HOME` in `routes.tsx` at another page; the Home nav item and `g h` |
| `SetupWizard` | "Setup wizard example" in `examples.test.tsx`; "the setup wizard example" in `wcag22.test.tsx` (the redundant-entry audit stays) | nothing else |
| `EntityPages` | `entities.test.tsx` | the Accounts and People nav items, `g a`, `g p` and "New account"; records still link to accounts, so render `AccountRef` in `src/app/registries/refs.tsx` as plain text, and drop the palette's account and people groups. In the tests, drop "New account" in `command-palette.test.tsx`, expect the account name as text in `registry.test.tsx`, and delete the entity-pages test in `routes.test.tsx` |

Step 6 removes what only the example's page imported. The rest of a domain's app layer (`src/app/api`, `model`, `mocks` for billing, reports and so on) can stay until you replace it: the mock server and the domain's tests still import it, and no page does, so it adds nothing to a page. When you do remove a domain, `npm run typecheck` names its tests. That includes its race test in `refetch.test.tsx` and its verbs in `telemetry.test.tsx`, which lists its model files by name.

**Never delete:**
- The system: `tokens/`, `src/styles/`, `src/primitives/`, `src/components/`, `src/layouts/`, `src/format/`, `src/internal/`, `src/index.ts`.
- The checks:
  - `scripts/`, `fixtures/`, `.storybook/` and `.github/workflows/`;
  - `tests/visual/`, with its fixtures;
  - every test in `tests/unit` that checks the system or the repo rather than one example: tokens, contrast, css, docs, manifest, story links, repo docs, routes, the WCAG 2.2 audits, the app layer's tests, and so on.

  The only tests you delete are those of an example you deleted, as the table lists.
- The app skeleton the checks run on:
  - `App.tsx`, `routes.tsx`, `ExampleShell.tsx`, `CommandMenu.tsx`, `Permission.tsx`, `ErrorPages.tsx`, `Jobs.tsx`, `Freshness.tsx`;
  - `SignInPage` (the accessible-authentication audit runs on it);
  - the records trio `ListPage`, `RecordPage` and `CreateEditFlow`, with their helpers. Rename and rebuild these as your own first resource rather than deleting them.

### 4. The first pull request, and branch protection

The copy carries the starter's Linux baselines, and a rebrand or a trim changes screenshots. So the first pull request does this:

1. Push a branch and open a draft pull request. **Check (tokens, types, lint, tests, rules, build)** must pass.
2. Regenerate every Linux baseline: `npm run test:visual:docker -- --full` and commit, or run **Actions → Update visual baselines** on the branch with **full** ticked. Both delete every Linux baseline first, so the baselines of deleted stories go too.
3. Mark the pull request ready. Review the new PNGs, then squash-merge once **Visual regression and axe** is green.
4. Now protect `main` under **Settings → Branches** with a branch protection rule:
   - require a pull request;
   - require the status check **Check (tokens, types, lint, tests, rules, build)**. Leave **Visual regression and axe** unrequired: it still runs on a pull request its changes reach, but screenshots are reviewed after merge (the full run on `main` and the **Baselines after merge** workflow, see CI). For a copy with users who'd rather not see `main` red, require it too;
   - leave "Require branches to be up to date before merging" off. With it on, every merge makes every other open pull request rebase and run CI again; the full visual run on `main` and every night is the backstop for two pull requests that pass apart and clash together.

   The rule's check picker lists only checks that have reported in the past week, which is why this step comes after the first CI run. If you do require the visual check, require the gate, never the "(1/4)" shards.

After that, every intended visual change lands with its baselines (see Visual baselines).

### 5. Plug in the real backend

- **Where it runs.** `index.html` loads `src/main.tsx`, which reads the settings below and calls `startApp` in `src/bootstrap.tsx`: it loads the session, then mounts `ExampleApp` inside `LocaleProvider` and `AppProviders`, as the stories and tests do. `npm run dev:app` serves it, `npm run build:app` builds it into `dist-app/` (`vite.app.config.ts`; the library build is unchanged), and `npm run preview:app` serves that build. Both servers answer a deep link with `index.html`, and your host must do the same (a history fallback).
- **One base URL.** Set `VITE_API_BASE_URL` (in the shell or `.env.local`), and the entry calls `configureApi({ baseUrl })` from `src/app/api/client.ts` before the app mounts. Unset, it's `/api` on the page's origin. For another origin, use an absolute URL; that backend then needs CORS. Requests, the assistant's stream and the live event source all build their URLs from it.
- **One resource at a time.** The zod schemas in `src/app/api/schemas.ts` stay the contract. Build the endpoint to match the schema, and the client parses the response exactly as it parses the mock's. `tests/unit/api-base.test.tsx` shows the swap for the records list: a real HTTP server serves one route (MSW's `passthrough()`), and the mocks answer the rest.
- **The mock API in the app.** `VITE_API_MOCKS` is on in `dev:app` by default and off in `build:app` unless set to `true` (a demo build). When on, the entry starts MSW's service worker (`src/app/mocks/browser.ts`, `public/mockServiceWorker.js`) before the first request. It answers the routes it knows and lets every other request through, so an endpoint you haven't mocked reaches the backend. With it off, the mocks aren't in the bundle.
- **Keep MSW for stories and tests.** The gallery and Vitest keep the mock handlers, so every state stays reproducible. Remove a mock route only when no story, test or demo uses it.
- **Live updates:** pass `eventSourceLive()` to `AppProviders` and serve Server-Sent Events at `/t/:tenant/events`, in the shape of `LiveEventSchema`.

### 6. The sign-in seam

No provider is chosen here. This is where one plugs in:

- **Before the app mounts:** in `startApp` (`src/bootstrap.tsx`), the provider completes sign-in, then `getSession()` (`GET /session`, parsed by `SessionSchema`) gives the session and the workspaces to pass to `AppProviders`. Its `signedOut` prop renders the sign-in page, which starts the provider's flow (`SignInPage` is the pattern).
- **Every request:** `request()` in `src/app/api/client.ts` is the one place to add `credentials: 'include'` (a cookie session) or an `Authorization` header (a token).
- **Sign-out:** `signOut` in `src/app/session.tsx` clears the cache, the write queues and the drafts, then calls `deleteSession()`. The provider's own sign-out goes there too.
- **A 401:** today it surfaces as the page's error state. With a real provider, send it back to sign-in, for example from a `QueryCache` `onError` in `createQueryClient` that calls `signOut`.

### 7. Keep the agent files accurate

`CLAUDE.md`, `llms.txt`, `llms-full.txt` and `design-system.manifest.json` describe the repo to coding agents.

- After each trim, `repo-docs.test.ts` names every line in `CLAUDE.md` and this README that points at something deleted. It checks every repo path in backticks, and the rules block's "Copy the matching golden example" list. That covers "Which example to copy" and most of the repo map.
- Examples named without a path are not checked. Edit those by hand: the `src/examples/` line of `CLAUDE.md`'s repo map, and this README's `src/examples/` repo-map line.
- Fix those lines, then run `npm run manifest`. `npm run check` fails until the generated files match.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Storybook dev server (the gallery). Restart it after `npm ci` or pulling: a running server keeps the old dependencies and stories, logs "Unable to index files", and serves a blank or stale gallery. |
| `npm run dev:app` | The app itself (`index.html` → `src/main.tsx`) on the Vite dev server, on the mock API unless `VITE_API_MOCKS=false`. |
| `npm run tokens` | Build `src/styles/tokens.css` and `src/tokens/tokens.ts` from `tokens/**/*.json`, then the token usage map `src/tokens/token-usage.json`. |
| `npm run tokens:check` | Rebuild tokens to a temp dir and fail if the committed files or the token usage map are stale. |
| `npm run manifest` | Generate the files for coding agents from the code, stories, usage docs, guides and `CLAUDE.md`: `design-system.manifest.json`, `llms.txt` and `llms-full.txt`. |
| `npm run manifest:check` | Regenerate them in memory and fail if any committed one is stale. |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm run lint` | ESLint (`lint:js`) and Stylelint (`lint:css`), zero warnings allowed. |
| `npm test` | Vitest: token, contrast, CSS-structure and component tests. |
| `npm run test:rules` | Lints every file in `fixtures/violations/` and asserts that the expected rule fires. |
| `npm run dead-modules` | Fails on any module under `src/` or `docs/` that no entry point reaches (the app, `src/index.ts`, a story, a test, a script or config), naming each. Exceptions go in `KEEP` in `scripts/dead-modules.ts`, with a reason. |
| `npm run build` | Library build (`dist/index.js`, `dist/styles.css`). |
| `npm run build:app` | App build into `dist-app/` (`vite.app.config.ts`), without the mock API unless `VITE_API_MOCKS=true`. `npm run preview:app` serves it. |
| `npm run size` | Bundle size budgets (size-limit) and the tree-shaking check over `dist/`; run after `build`. |
| `npm run build-storybook` | Static gallery in `storybook-static/`. |
| `npm run test:visual` | Build Storybook, then screenshot and axe every story in light and dark, and run the WCAG 2.2 checks: one page load per story per theme. On a platform without committed baselines (macOS) screenshots are skipped; use `test:visual:changed` for native screenshot feedback. |
| `npm run test:visual:update` | Rewrite this platform's baselines (only Linux ones are committed: use `test:visual:canonical -- --update`). |
| `npm run validate` | `check`, then `test:visual:changed`: the fast local gate, native, no Docker. |
| `npm run test:visual:canonical` (alias `test:visual:docker`) | `test:visual:changed` in the CI image, so the Linux baselines it checks and writes are the committed ones. `-- --update` rewrites the ones your change moved; `-- --full` regenerates them all. Needs Docker (Docker Desktop on a Mac). The image runs as `linux/arm64`, natively on Apple silicon: `--full` (all 1,418 baselines) takes about 6 minutes on a 10-core Mac. On an x86 machine Docker emulates arm64, which is slow; use the workflow there. |
| `npm run regen` | Every generated file: tokens, token usage, the manifest and the llms files. After a merge conflict in any of them, take either side and run this. |
| `npm run test:wcag22` | Build Storybook, then only the WCAG 2.2 checks (target size, focus not obscured, accessible authentication, consistent help) and their fixtures. |
| `npm run test:visual:changed` | Screenshots, axe and the WCAG 2.2 checks for only the stories and Docs tabs your changes can reach (since `origin/main`, uncommitted included; `-- --base <ref>` for another base), natively. On Linux screenshots compare with the committed baselines; elsewhere with the merge base rendered on the same machine (see "Native screenshots"). Prints the plan first; `-- --dry-run` stops there. Builds Storybook when it's stale, and ends with how long each stage took. See "Targeted visual runs". |
| `npm run check` | `tokens:check`, `manifest:check`, `typecheck`, `lint:js`, `lint:css`, `dead-modules`, `test`, `test:rules`, `build`, `build:app`, `size` (`scripts/check.ts`). They run concurrently, except `size`, which waits for `build`; each stage's output is printed whole when it ends (a passing one only with `-- --verbose`), then a timing table. About 22s on a 10-core Mac (31s one at a time: `-- --serial`). |

## Repo map

```text
tokens/                 DTCG token source: primitive/ → semantic/ → component/
scripts/build-tokens.ts Style Dictionary build and --check mode
scripts/token-usage.ts  token usage map (src/tokens/token-usage.json) and --check mode
scripts/check-tree-shaking.ts  single-component imports pull in only what they compose
scripts/manifest.ts     the files for coding agents (manifest, llms.txt, llms-full.txt) and --check mode; collector in manifest-collect.ts
scripts/checks/         token, contrast, chart palette, token usage and CSS checks (used by Vitest)
scripts/test-rules.ts   proves every lint and type rule fires
scripts/dead-modules.ts fails on modules under src/ and docs/ that no entry point reaches (graph from affected-stories.ts)
scripts/eslint/         local ESLint rules (drag-needs-alternative)
src/styles/             index.css (layer order) · reset · generated tokens.css · base · utilities
src/tokens/tokens.ts    generated, typed var() map (semantic + component tiers)
src/tokens/token-usage.json  generated: tokens read by each component, primitive and layout (schema beside it)
src/primitives/         Stack, Cluster, Grid, Center, Sidebar, Switcher, Cover, Frame, Box, Reel, Imposter, VisuallyHidden
src/components/         the components; the only place (with primitives) Radix is imported, and the only place React Aria is
src/layouts/            AppShell (every signed-in page), PageLayout (a page's nav · main · aside), AuthLayout (signed out), FocusedLayout (multi-step tasks), AssistantPanel (an assistant beside the page), SplitView (list + detail)
src/format/             locale formatting over Intl: LocaleProvider, useFormat (part of the system; no dependencies)
src/app/                the app layer the examples use (not the system): api/ (client, zod schemas, live events, jobs),
                        model/ (keys, queries, predicates, projections, mutations, selection, permissions, live, write
                        queues, conflicts, drafts, undo, jobs), session.tsx (memberships, workspace switch, sign-out),
                        telemetry.ts (the one sink), windowing.ts (useWindowedRows),
                        routing/ (route type, matcher, RouteView, RenderBoundary, lazyPage, AppLink), url/ (useUrlState, navigation guard,
                        restoration), registries/ (field registry, entityType → fields), mocks/ (MSW; b2b.ts serves the
                        inbox, members and the audit log; live.ts the live channel; jobs.ts the job runner)
src/internal/           closed-API helpers (Closed<>, UNSAFE_ escape hatch)
src/examples/           golden example pages, one per archetype (four AI examples; import, search, notifications, reports, integrations, billing), the schema-driven entity pages, and the app's route table
                        (routes.tsx) and assembly (App.tsx); also a consumer lint target
src/index.ts            public entry point
src/main.tsx            the app entry (index.html loads it): reads VITE_API_MOCKS and VITE_API_BASE_URL, then startApp in bootstrap.tsx
public/                 the app's static files: MSW's service worker for the mock API (vite.app.config.ts builds the app into dist-app/)
docs/                   Storybook-only pages: foundations/ (generated from the token source), guides/, usage/ (Docs tab sections); docs-only helpers in ui/
fixtures/violations/    one deliberate violation per rule; fixtures/clean/ = negative controls; fixtures/manifest/ = the manifest extractor's test entry
tests/unit/             Vitest suites
tests/visual/           Playwright suite: screenshots + axe, WCAG 2.2 checks (shared story opening in storybook.ts); __screenshots__/linux/ is committed
tests/visual/fixtures/  check-fixture stories that each WCAG 2.2 check must fail (hidden from the gallery)
.storybook/             gallery config, theme, width, locale, latency, failure and role toolbars, the Tokens panel (manager.tsx); public/ holds MSW's service worker
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
| The system is UI-only: runtime `dependencies` are exactly react, react-dom, radix-ui, react-aria-components and @internationalized/date | Vitest | `tests/unit/dependencies.test.ts` |
| Data libraries (msw, TanStack Query, zod) and `src/app` never enter the system | `no-restricted-imports` in the components, primitives and layouts blocks; a fixture per boundary | `eslint.config.js`, `fixtures/violations/eslint-*-imports-data.tsx` |
| Only trusted data enters the cache: every API response is parsed with its zod schema | Vitest: an invalid payload becomes an error and the cache stays empty | `src/app/api/client.ts`, `tests/unit/api.test.ts` |
| Every field type has a registry entry; unknown types fall back and never throw | TypeScript (registry keyed on the union, proved with `@ts-expect-error`) and Vitest | `src/app/registries/fields.tsx`, `tests/unit/registry.test.tsx` |
| Escape hatches are visible | `no-restricted-syntax` flags `className`, `style` and `UNSAFE_*` in consumer code | `eslint.config.js` |
| Exceptions carry a reason | `eslint-comments/require-description`, unused disables are errors; Stylelint `reportDescriptionlessDisables` and `reportNeedlessDisables` | both configs |
| The rules are actually loaded | `test:rules` (every rule has a fixture, fixtures must not be ignored or fail to parse, clean controls must pass) | `scripts/test-rules.ts` |
| Gallery: every variant/size/state renders correctly in light and dark | Playwright screenshots against Linux baselines | `tests/visual/stories.spec.ts` |
| Gallery is accessible | axe (WCAG 2.2 A/AA) on every story, both themes | `tests/visual/stories.spec.ts` |
| WCAG 2.2 criteria axe doesn't decide: target size (2.5.8), focus not obscured by sticky content (2.4.11), accessible authentication (3.3.8), consistent help (3.2.6) | Playwright on every story, in the light-theme load its screenshot and axe use; each check proved by a fixture story that must fail it | `tests/visual/stories.spec.ts`, `tests/visual/wcag22-run.ts`, `tests/visual/wcag22-checks.ts`, `tests/visual/wcag22.spec.ts` (fixtures), `tests/visual/fixtures/` |
| Every drag has a single-pointer alternative (2.5.7) | `starter/drag-needs-alternative` (ESLint): `data-drag-alternative` on draggable elements and in files importing a drag-and-drop library | `scripts/eslint/drag-needs-alternative.js` |
| Sign-in works with a password manager and paste; wizards never ask twice (3.3.8, 3.3.7) | Vitest audits on the sign-in and wizard examples, with negative controls | `tests/unit/wcag22.test.tsx` |
| Every exported component, layout and primitive has a usage doc, attached to a story title, with every section filled and live examples that render | Vitest (matched by identity against `src/index.ts` exports, with negative controls) | `tests/unit/docs.test.tsx`, `scripts/checks/docs-coverage.ts` |
| Foundations show the real tokens and the tested contrast pairs | Generated from the token source through the checks' own model | `docs/foundations/`, `scripts/checks/token-model.ts`, `scripts/checks/contrast-pairs.ts` |
| Links in the docs lead somewhere: every `StoryLink` and story id in `docs/` names a story or Docs tab that exists | Vitest: ids computed from every CSF file with Storybook's csf-tools, with negative controls | `tests/unit/story-links.test.ts`, `scripts/checks/story-links.ts` |
| No orphaned modules: everything under `src/` and `docs/` is reached from the app, the library entry, a story, a test, a script or config (so a trim leaves nothing behind) | `dead-modules` over the import graph of `test:visual:changed` (type-only imports included, barrels by name); exceptions listed with a reason, stale ones fail | `scripts/dead-modules.ts`, `tests/unit/dead-modules.test.ts` |
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
| Components | `src/components/` | other components, primitives, tokens, `src/format`, Radix, React Aria Components; no layouts, no examples, no `src/app`, no data libraries | `components` |
| Formatting | `src/format/` | `Intl` only; no components, no React Aria, no data libraries | none: no CSS |
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

`npm run size` (the last step of `npm run check`, so CI enforces it) measures the built library with [size-limit](https://github.com/ai/size-limit), minified and gzipped, with `react`, `react-dom`, `radix-ui`, `react-aria-components` and `@internationalized/date` left out as the consumer's own dependencies:

| Budget | Limit | Measures |
|---|---|---|
| Library JS | 38 kB | `dist/index.js`, everything exported |
| Library CSS | 18.6 kB | `dist/styles.css` |
| One component | 640 B | `import { Button }` from `dist/index.js`: what a consumer pays for one component |

It then runs `scripts/check-tree-shaking.ts`: for every unit with a public export, it bundles `import { <Export> }` from `dist/index.js` and fails if the output contains any component, primitive or layout other than that unit and the units it composes (`composesAll` in `src/tokens/token-usage.json`). A module-level side effect or a barrel import that drags in unrelated components fails here. Icons are checked the same way, by their path data: an import may carry only the icons its unit and what it composes name in their source, so `import { Button }` carries none (Button draws the icon it's given). A component that looked icons up by name would carry all of them and fail. The CSS is one stylesheet by design, so it has a budget but no tree-shaking.

**Changing a budget deliberately.** A failing budget means the library grew. First find out why: `dist/index.js` is not minified and marks each source module with a `//#region` comment, so diffing it against a build of `main` shows what grew. If the growth is intended (a new component, new tokens), raise the `limit` of that entry in `.size-limit.json` to the new size plus about 10% headroom, in the same pull request as the change, and say why in its description. Never raise a limit to make an unexplained increase pass, and lower it again when something is removed.

## Theming

Semantic colour tokens hold both values as `light-dark(light, dark)`. `:root` sets `color-scheme: light`, and `data-theme="dark"` on `<html>` switches to dark. Components contain no theme rules at all. The product ships light, and turning dark on is a one-line change. Contrast is tested in both themes, and the gallery captures both.

## What's in the system

| Kind | Parts |
|---|---|
| Layouts | `AppShell`: skip link, sidebar (brand + `Nav`) that collapses to a remembered icon rail, header (breadcrumbs, actions, help in the same place on every page, account menu), `main` as the only scrolling region, optional sticky action bar (focus scrolls clear of it), toast region; below `size.breakpoint.md` the nav opens in a `Drawer`. `PageLayout`: a page's section nav, main column and named aside, stacking below `size.breakpoint.sm`. `AuthLayout`: brand, one centred card and a footer for signed-out pages. `FocusedLayout`: a task header with an exit, one column and a sticky action bar for wizards. `AssistantPanel`: an assistant in AppShell's `assistant` slot, resizable (drag, arrow keys or Widen), closable to a launcher, a `Drawer` below `size.breakpoint.md`. `SplitView`: a list and the selected item side by side, resizable (drag, arrow keys, or a click through preset widths), one pane below `size.breakpoint.sm`. |
| Page structure | `PageHeader` (the page's h1, status, description, actions) |
| Navigation | `Nav` (grouped, `aria-current`, icon rail), `NavTabs` (sections as routes), `Breadcrumbs`, `Tabs` (panels in place), `Link` and `LinkProvider` (router adapter), `Pagination`, `Stepper`, `Menu`, `CommandPalette` (⌘K: grouped, ranked, announced), `ResultList` (a page of results as one tab stop, ↑ ↓ between them) |
| Actions | `Button`, `Menu`, `ContextMenu`, `Toolbar` (one tab stop, roving focus), `SegmentedControl`, `Toggle`, `CopyButton` |
| Keyboard | `useShortcut` (one registry: reserved keys refused, conflicts reported, silent in fields and dialogs, single keys can be turned off), `ShortcutHelp` (the ? overlay), `Kbd`, `formatShortcut`, `ariaKeyShortcuts`; `Tooltip` and `MenuItem` take a `shortcut` |
| Forms | `TextField` (a password gets a show-password toggle), `SearchField`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `FileUpload` (all share the `Field` anatomy and take an `id` for error-summary links); `Combobox`, `MultiSelect`, `DatePicker`, `DateRangePicker`, `NumberField` (React Aria, locale and time zone from `LocaleProvider`, ISO dates and minor units in and out); `InlineEdit` |
| Data display | `Table`, `Badge`, `Tag`, `Avatar`, `Card`, `Stat`, `Meter`, `Timeline`, `CodeBlock`, `Divider`, `Heading`, `Text`, `DocumentViewer` (a document generated from data: native selection kept as highlights, `DataField` values and placeholders), `Highlight` (a marked passage in one of three tones) |
| Feedback and page states | `Banner`, `Toast`, `EmptyState`, `Spinner`, `Skeleton`, `Progress`, `Tooltip` |
| AI patterns | `ChatThread`, `Message`, `Composer`, `StreamingText` (safe Markdown, sentence-level announcements), `Citation` and `SourcesList`, `AiMarker`, `Suggestion` (ghost text), `ReviewChanges` (diffs, accept or reject, apply, undo), `Feedback`, `Disclosure`, `Accordion`, `Kbd`; the Guides → AI patterns page says which surface to use and the rules they share |
| Overlays | `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip`, `HoverCard` |
| Layout primitives | `Stack`, `Cluster`, `Grid`, `Center`, `Sidebar`, `Switcher`, `Cover`, `Frame`, `Box`, `Reel`, `Imposter`, `VisuallyHidden` |
| Formatting | `LocaleProvider` (locale and time zone), `useFormat()` (date, time, relative time, number, percent, compact, money from integer minor units, list, file size), `createFormatter`, `currencyDigits` |

## Which example to copy

Signed-in pages render inside `AppShell` and fill its slots; they never rebuild the frame. Signed-out pages use `AuthLayout`, and focused multi-step tasks use `FocusedLayout`. Every page starts with a `PageHeader`. Copy the example for the archetype, not another screen.

| Archetype | Copy | It shows |
|---|---|---|
| List / index | `src/examples/ListPage.tsx` | PageHeader with one primary action, saved views (save, rename, default, delete, "Modified"), view tabs with server counts, SearchField, a Filters popover with removable chips and a Columns popover, a sortable table or a keyboard-operable board over the same query (`RecordBoard.tsx`, Move to… with drag as the alternative), pagination, all server-side and in the URL; row selection, "Select all N matching", a bulk bar and bulk delete with partial failure ("all matching" as a job with truthful progress); live updates ("Show 3 new", rows never reorder under the cursor); a board move with Undo; Back restores scroll and focus to the row; actions disabled with a reason per role; loading (skeleton rows), first use, no results and load error; quick-create dialog, toast |
| Record / detail | `src/examples/RecordPage.tsx` | breadcrumb, PageHeader with status and a "More" menu, NavTabs (Overview · Activity · Files, previews in a Frame), properties aside rendered from the field registry; optimistic rename through the record's write queue ("Saving 2 changes…") with a field-level conflict panel; archive and tag removal with Undo instead of a confirmation; confirmed delete; changes and deletes by someone else, live; loading and error with the shell up |
| Create and edit | `src/examples/CreateEditFlow.tsx` | full-page form for a heavy record (fields from the field registry), quick-create dialog for a light one, errors on blur and submit, a focused error summary linking to fields, pending submit in a sticky action bar, a create that is safe to retry (idempotency key); edit (`/records/:id/edit`) as a versioned write with a conflict panel (Keep mine, Take theirs, per field); drafts owned by the form, autosaved and restored, an unsaved-changes guard, a warning when the record changes underneath |
| Settings | `src/examples/SettingsPage.tsx` | Personal and Workspace tiers in a grouped sub-nav (PageLayout's nav slot), one card per category with its own Save, a success banner |
| Sign-in | `src/examples/SignInPage.tsx` | AuthLayout; SSO first, an emailed sign-in link, a password as the secondary route; a failed-sign-in banner; a verification-code step |
| Wizard | `src/examples/SetupWizard.tsx` | FocusedLayout with an exit, Progress and Stepper; validation per step, focus to each step's h1; a review step with Edit |
| Dashboard | `src/examples/DashboardPage.tsx` | a date range (SegmentedControl) in the PageHeader, Stat tiles in a Switcher, usage Meters, recent activity, a needs-attention table |
| Entity list, record and form | `src/examples/EntityPages.tsx` | schema-driven pages for any entity in `src/app/registries/entities.ts` (accounts, people): columns and properties through the field registry, related records joined by id with rollups, create and edit with a focused error summary, Edit disabled with a reason |
| The app and its routes | `src/examples/App.tsx`, `routes.tsx` | the route table (path → layout + page + guard), lazy pages, LinkProvider with the app's router link, a 403 page from the guard, the 404 fallback |
| Inbox / queue | `src/examples/InboxPage.tsx` | a SplitView of the list and the open item, the tab and open item in the URL, keyboard triage (j/k, e, u, x, o) from the shortcut registry mirrored by a toolbar, a row context menu and a bulk toolbar, unread state, optimistic triage with rollback |
| Admin console | `src/examples/AdminConsole.tsx` | members (invite, change role with a review of the capabilities it changes, remove; your own role and the last admin protected) and a filterable audit log (actor, events, a date range in the reader's time zone, expandable rows, CSV export); disabled-with-reason and hidden actions by capability; every member write audited |
| Assistant beside a page (AI) | `src/examples/RecordCopilot.tsx` | the record page, untouched, with an `AssistantPanel` joined through `WithAssistant`: answers citing record fields and activity, sources that link into the record, tool activity, Stop, Retry, Edit, Feedback, a refusal, rate limit, content filter and dropped connection |
| Inline AI in a form (AI) | `src/examples/CreateWithAi.tsx` | Suggest beside the field (disabled with a reason per role), ghost text with Tab/Esc, accepted text marked until edited, one Undo |
| AI-proposed changes (AI) | `src/examples/AiReviewChanges.tsx` | an agent's steps, a proposal limited to what the person could do, `ReviewChanges`, apply and undo through `moveRecord`, partial failure |
| Chat page (AI) | `src/examples/AssistantChatPage.tsx` | history with the open conversation in the URL, new chat, rename, delete, the composer in the sticky footer, every answer state |
| Error / 403 / 404 | `src/examples/ErrorPages.tsx` | a signed-in 404 and 403 inside the shell and a server error in AuthLayout: EmptyState as the h1, Try again, a way home |
| Import (CSV) | `src/examples/ImportWizard.tsx` | FocusedLayout and Stepper: upload with limits up front, columns mapped to fields from the field registry, every row checked with the server's rules (problems by row, field and fix, downloadable), the import as a job (progress, partial failure listing each row, Retry failed) |
| Search results | `src/examples/SearchPage.tsx` | records, accounts and people in one ranked list: type tabs and a status facet with server counts, matched text in bold, pagination, all in the URL; a `ResultList` (one tab stop, ↑ ↓) that j/k move too, and /; the palette's "See all results" opens it |
| Notification centre | `src/examples/NotificationsPage.tsx`, `Notifications.tsx` | the bell in the header (unread count, latest in a popover, Mark all read), All and Unread with counts, a type filter, optimistic mark read, live arrivals with "Show N new" |
| Reports (charts) | `src/examples/ReportsPage.tsx`, `charts.tsx` | one Card per question with the answer in words, small SVG charts from `color.chart.*` only (stacked bar with a legend, bars, columns), each with its numbers as a table; no chart library |
| Catalogue (integrations) | `src/examples/IntegrationsPage.tsx` | connected and available apps as Cards, pessimistic connect and confirmed disconnect, settings in a Drawer from the URL with a versioned save, disabled with the reason for non-admins |
| Billing and usage | `src/examples/BillingPage.tsx` | plan and next invoice, a Meter per limit in words, invoices, a change-plan Dialog whose plans that don't fit are disabled with the reason; money in integer minor units |
| First-run checklist | `src/examples/Onboarding.tsx` (on the dashboard) | for admins, inside the app: steps the server works out from the workspace, Progress in words, Dismiss with Undo and a way back |

`src/examples/ExampleShell.tsx` is the app's shell composition (one nav config, one account menu, and inside the app the command palette and the ? overlay from `CommandMenu.tsx`) that each page passes its location and content to. The list, record and create examples read and write through the app layer in `src/app` (below); `src/app/model/status.ts` holds the one status-to-tone map. `src/examples/records.ts` keeps a few static rows for the dashboard.

## Data: the app layer

The design system draws; `src/app` knows. It is consumer code, like the examples, and the system never imports it. The **Guides → Data** page in the gallery explains it in full.

- **One server cache** (TanStack Query) with keys `[tenant, scope, resource, params]`. The workspace is in every key and every request; the permission scope partitions what each role cached.
- **Entities joined by id**: records point at their account and owner by id, and every name on screen is read from the account and people directories at render. Renaming an account is one cache write.
- **The query-cache trap, handled**: a record write patches its detail and every cached list page holding it (`patchListedRecord`), then invalidates what the patch can't know. A test proves a detail edit shows in an already-cached list with every list request held open.
- **Permissions**: capabilities (`record:rename`, `account:edit`, …), roles mapped to them in one place (`ROLE_CAPABILITIES`), and one predicate, `can`, used by the controls, the route guard, every mutation and the mock server (403). Viewers get a narrower projection (no drafts), filtered in the query.
- **Workspace and session boundaries**: switching workspace cancels the old one's reads and remounts the page; a permission change drops the old scope's partition; sign-out cancels everything and clears the cache.
- **Route table** (`src/examples/routes.tsx`): path → layout + page + guard, lazy pages, a 404 fallback, links through `LinkProvider`. Every page renders inside its own error boundary (`RenderBoundary`, from `RouteView`): a renderer that throws costs that page, never the shell, shows the error state with Try again, and is reported. A page whose code fails to load says so, and Try again fetches it again (`lazyPage`: React.lazy keeps a failed import forever); if that fails too, it offers Reload the page.
- **Schema-driven pages**: `entityType → fields` config (`src/app/registries/entities.ts`) gives accounts and people their list, record and form pages.
- **The assistant** (`src/app/api/ai.ts`, `src/app/model/ai.ts`, `src/app/mocks/ai.ts`): answers stream as newline-delimited JSON events, each parsed with zod; the mock is scripted and seeded. It has no permissions of its own: it reads what `canSee` allows in the person's workspace, proposes only what `can` allows, and applies nothing itself (apply and undo go through `moveRecord`). Conversations are server state with named verbs.
- **Saved views**: named filter, sort, columns and display, persisted per person per workspace; the URL stays the truth.
- **Validate at the boundary.** Every response is parsed with a zod schema in `src/app/api/client.ts`; a bad payload becomes an error state and never reaches the cache.
- **Named predicates** (`isOpen`, `canDelete`, the view predicates) drive the filters, tab counts, badges, bulk guards and the mock server. Views are pure projections (`toRow`).
- **URL state** (`useUrlState`) for view, search, filters, sort and page: push for navigation, replace for refinements, debounced search.
- **One named mutation per verb** (`renameRecord` optimistic; `updateRecord` versioned; `archiveRecord` and `untagRecord` undoable; `createRecord` with an idempotency key; `bulkDeleteRecords` and `startBulkDelete` for listed ids and "all matching"), each documenting what it patches and invalidates.
- **Freshness**: a 30 s staleTime with refetch on focus and reconnect, plus live events reconciled by one handler (patch in place, count new rows behind "Show N new", never reorder under the cursor), filtered by grant and idempotent by version.
- **Concurrency**: versioned writes (`If-Match`, 409 with theirs, 428 without) compared field by field, re-based on their own when nothing collides, a conflict panel when something does; per-record write queues that serialise writes, show what's pending and rebase on failure.
- **Drafts, undo and jobs**: drafts owned by the form (autosaved, restored, guarded on navigation, cleared on sign-out); Undo instead of "Are you sure?" for what can be undone (a held write or a compensating one), confirmation kept for deletes; bulk work as jobs with truthful status (queued, n of N, partial failure, failed, cancelled) visible on every page.
- **History**: push to open, replace to refine; Back restores a list's scroll and focus to the row that was opened.
- **A typed field registry** renders record properties and form fields; exhaustive at compile time, with a runtime fallback that reports and never throws.
- **Instrumentation**: every named mutation reports start and one outcome (success with its duration, failure with its code, cancelled) from the QueryClient's MutationCache to one sink (`src/app/telemetry.ts`), as do render failures. Names, ids and codes only: no personal data.
- **Scale**: server-side paging at any size; past 1,000 rows the list offers a windowed Scroll display (pages of 100 fetched as they come into view, only the rows in view rendered, still a table with aria-rowcount and row indexes); projections memoised by identity. Unknown outcomes (a dropped connection after the server applied a create) refetch, and the idempotency key makes the retry safe.
- **A mock API** (MSW) over a seeded database: 240 and 120 records, 12 and 8 accounts for two tenants, or 10,000 Acme records in the large dataset (`mockApi({ dataset: 'large' })`, or the gallery's Dataset toolbar). The gallery's Latency, Failures and Role toolbars change its behaviour, and failures are real 500 (or 403) responses; the Another user… toolbar pushes a colleague's edit, add or delete through the live channel. The same handlers serve Vitest (`msw/node`).

## Adding a component: walk the decision ladder

Stop at the first yes:

1. **Is it a new page?** Copy the matching example (table above), render it inside `AppShell`, and compose existing parts. No new component.
2. **Does an existing component need a new look?** Add a **variant** (a new value in its closed `data-*` vocabulary, plus a story). A new status extends the status-to-tone map; it doesn't add a badge.
3. **Is it a genuinely new region or intent?** Add a **component** in `src/components/<Name>/`:
   - `Name.tsx`: props typed with `Closed<…>` (no `className`/`style`), a required accessible name, variants as closed unions, and state via aria/native attributes. Wrap Radix here if you need behaviour. Never expose `asChild`.
   - `Name.css`: inside `@layer components`, BEM-lite classes, in the order block, parts, variants, states. Tokens only.
   - `Name.stories.tsx`: one story per variant, size and state. The visual and axe suite picks them up automatically.
   - `docs/usage/<Name>.usage.tsx`: the usage section of its Docs tab (see Documentation below).
   - Export it from `src/components/index.ts`.
4. **A new primitive?** The highest bar: domain-agnostic, token-driven, impossible to express as a composition. It changes tokens, component styles and `CLAUDE.md` in the same PR.

Then run `npm run check` and `npm run test:visual:docker -- --update`, commit the new baselines with the change, and review them in the PR diff.

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
- **Latency, Failures and Role toolbars**: how the mock API behaves (delay, failure rate) and who you are in the mock workspace (viewer, editor or admin; admin by default). A story about a role sets it with `mockApi({ role })`, which wins over the toolbar.
- **Tokens panel**: for the current component, primitive or layout story, every token it reads, in its own CSS, through a prop (`gap="md"` → `space.gap.md`) or through the units it composes, with the token's tier, alias chain (semantic → primitive) and light and dark values. It renders `src/tokens/token-usage.json`, which `npm run tokens` generates and `tokens:check` keeps current. Content a caller passes in (an AppShell's nav, a Card's body) is the caller's, so it isn't listed. The JSON is documented by `src/tokens/token-usage.schema.json`, for tools that need a machine-readable map.

## Documentation

The gallery is the documentation. Everything in it is rendered from the system, so it can't describe a system that no longer exists.

| Section | Where | What |
|---|---|---|
| **Foundations** | `docs/foundations/` | Colour, data visualisation (chart palettes with their contrast and distances), typography, spacing/sizing/radius, breakpoints and layout grid, elevation and motion, layers (which units use each z tier, from the token usage map), focus and target size, icons. Names come from the generated `vars` map, and samples paint with each token's `var()` from `tokens.css`, except colour swatches, which paint with values resolved from the source so light and dark can sit side by side; values, dark values, "use for" notes (`$description`) and contrast ratios come from the token source through `scripts/checks/token-model.ts` and the shared pairs in `scripts/checks/contrast-pairs.ts`, the same code the tests run. |
| **Guides** | `docs/guides/` | Getting started, starting a new portal (copy, rename, trim, a real backend, the sign-in seam), principles, the decision ladder, layout, page archetypes, data, accessibility, accessibility conformance (what's automated, what needs a person, how to run it), an accessibility statement template, content, forms, keyboard and power users (the command palette, the shortcut registry and its conventions), motion, browser support and the platform (the Baseline rule, each platform feature in use and its fallback, and the per-overlay decision on native popover and anchor positioning), theming and adding a brand, escape hatches, contributing and versioning, testing, agents (how coding agents use llms.txt and the manifest), and AI patterns (surfaces, provenance, consent and undo, permissions, honest failure, streaming accessibility). |
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
| `llms.txt` | The [llms.txt](https://llmstxt.org) entry point: name, summary, the agent rules block, then one line per guide, foundation page, component, primitive, layout, utility and golden example, linking to its file with a short description (examples by title). Kept within its byte budget (`LLMS_BUDGET_BYTES` in `scripts/checks/llms.ts`) by a test. | whole, at the start of every session |
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

`.github/workflows/ci.yml` runs on every pull request, on pushes to `main`, every night, and by hand (Run workflow):

| Job | Runs | What it does |
|---|---|---|
| Check (tokens, types, lint, tests, rules, build) | always | `npm run check` |
| Detect UI changes | always | `dorny/paths-filter` sets `ui` when anything that can change a pixel or an axe result changed: `src/**`, `docs/**`, `tokens/**`, `scripts/checks/**` (the Foundations pages import them), `.storybook/**`, `CLAUDE.md` (the Agents guide shows its rules block), `tests/visual/**`, `playwright.config.ts`, `package.json`, `package-lock.json`, `.nvmrc` or the workflow itself |
| Build Storybook | `main`, nightly, dispatched, or a ready (non-draft) pull request where `ui` changed | builds `storybook-static/` once and uploads it as an artifact; a pull request's run builds it through `test:visual:changed -- --self-check`, so a hole in the story graph fails before the graph decides what to test |
| Visual regression and axe (1/4) … (4/4) | same as Build Storybook | four parallel shards (`fail-fast: false`) over the same artifact, in the Playwright image the lockfile pins (`mcr.microsoft.com/playwright:v<version>-noble`), the one the baselines are made in. A pull request (or a dispatched run) runs only the stories its changes reach (`test:visual:changed` against its base); `main` and the nightly run run every spec: screenshots, axe and the WCAG 2.2 checks. Each shard uploads its own report on failure |
| Visual regression and axe | always | the gate: passes when every shard passed, or when the shards were skipped (a draft, or nothing visual changed) |

- **Only Check is required.** A pull request merges once **Check** passes. Its visual run (when it isn't a draft and something visual changed) is information: a red screenshot shard there is fine to merge when the change is the one you meant, and the run on `main` turns it into a baselines pull request. An axe or WCAG 2.2 failure is a bug: fix it before merging, since nothing after merge will.
- **Pull requests run what they reach; `main` runs everything.** The affected set comes from the same graph as `test:visual:changed`, checked against the bundler's on every run. Anything that reaches every story (tokens, global styles, the lockfile, the Playwright config) still runs everything. The full run on `main` and the nightly run catch what two pull requests do together.
- **Superseded runs are cancelled.** A new push to a pull request cancels the run it replaces; runs on `main` are never cancelled.
- **If you require the visual check, require the gate, not the shards.** A matrix job skipped by its `if` never expands, so a check named "(1/4)" would never report.
- **Keep the `ui` filter complete.** Anything new that feeds the gallery (a folder of stories, a script the gallery imports) goes into the filter in the same change, or pull requests that touch only it skip the visual job.
- **Screenshots on `main` are reviewed after merge.** When the full visual run on `main` (a push or the nightly run) fails, the **Baselines after merge** workflow (`.github/workflows/baselines-after-merge.yml`) regenerates every Linux baseline from that commit in the canonical image. When any changed, it force-pushes them to one rolling branch, `visual-baselines/main`, and opens a pull request to review image by image (with a `BASELINES_TOKEN` secret; without one, it links to open it yourself). An axe or WCAG 2.2 failure changes no PNG, so it opens nothing: `main` stays red until the code is fixed. It can also be run by hand on `main`.
- The **Update visual baselines** workflow is the fallback for anyone without Docker. It runs in the same image, rewrites the baselines of the stories the branch reaches (or every baseline, with **full**) and commits them. A push made with `GITHUB_TOKEN` starts no workflow, and a dispatched run's checks don't count for a pull request, so add a `BASELINES_TOKEN` secret (a fine-grained token with `contents: write` on this repo) and it pushes with that, starting CI as any push does; without it, re-run the pull request's CI after it commits.

## Visual baselines

- Screenshots live at `tests/visual/__screenshots__/{platform}/<story-id>--<theme>.png`. Only `linux/` is committed. It is made in the Playwright image the lockfile pins, on arm64, the same image and architecture CI compares in (the visual jobs run on `ubuntu-24.04-arm`, free for public repositories). Screenshots depend on the fonts the browser renders with, which the image fixes (a runner with `playwright install --with-deps` has different ones, and differs by about 1% of pixels), and on the CPU architecture: x86 rasterises backdrops and shadows a little differently. So the image always runs as `linux/arm64`; on Apple silicon Docker Desktop runs it natively, and its PNGs are CI's byte for byte.
- **Make them with the change.** `npm run test:visual:canonical -- --update` runs the stories your change reaches in that image and rewrites their Linux baselines; commit them with the change, and one push runs CI once. New stories get their baselines on any run. Without Docker, or on an x86 machine, run the **Update visual baselines** workflow on the branch instead: the same image on GitHub's arm64 runners, a few minutes.
- **A Playwright upgrade changes the image**, and so every screenshot: regenerate them all (`-- --full`) in the same pull request as the bump.
- In CI, `updateSnapshots: 'none'` applies. While no Linux baselines exist, screenshot tests skip with a notice (each shard reports it). Once any exist, a story without a baseline fails, and so does any pixel difference.
- After an intended visual change: commit the updated PNGs with it (above), and review them in the PR.
- Stories tagged `no-visual` get no screenshot and no axe run. Only the WCAG 2.2 check fixtures use it: they are deliberate violations.
- **Data stories are deterministic.** Every Playwright spec (screenshots, axe and the WCAG 2.2 checks) opens stories through `openStory` in `tests/visual/storybook.ts`, which opens every story with `latency:0;failure:0;role:admin` in its globals (a story that sets its own role with `mockApi({ role })` keeps it), freezes the page clock at the instant the mock data was seeded for (`SEED_EPOCH`), and waits for `html[data-queries-settled="true"]` on stories tagged `data`. A story that holds a request open on purpose is tagged `busy` and isn't waited on. Each story gets a fresh mock database and a fresh cache.
- **Screenshots are byte-stable.** Chromium launches with `--disable-partial-raster` (in `playwright.config.ts`). Without it, a region that repaints after a story settles (a list arriving, a button leaving its pending state, a dialog opening) is re-rasterised on its own, and rounded edges come out a colour level or two different from a full raster. That stays under the comparison threshold, but it churned baseline files on every run.
- Stories tagged `modal-open` (open Dialog, Drawer, Select or Menu) relax only axe's `aria-hidden-focus`. Radix hides the page behind a focus-trapped modal layer, and axe can't see the trap.

## Targeted visual runs

The full visual run is about 1,510 tests (one per story per theme). While iterating, `npm run test:visual:changed` runs only what your branch can affect, natively (`npm run test:visual:canonical` does the same in the CI image, against the committed Linux baselines). Pull requests run the same affected set in CI; `main` and the nightly run run everything.

```sh
npm run test:visual:changed                                   # changes since origin/main, uncommitted and untracked included
npm run test:visual:changed -- --base HEAD                    # only what you haven't committed yet
npm run test:visual:changed -- --dry-run --verbose            # the plan: changed files → story files → stories, and why
npm run test:visual:changed -- -- --grep @a11y               # anything after a second -- goes to Playwright
```

### Native screenshots

Committed baselines are Linux, made in the Playwright image (`test:visual:canonical`), and they are the only ones CI trusts. A Mac renders text and anti-aliasing differently, so it can't compare against them, and comparing a branch against its own screenshots would catch nothing. So on a platform without committed baselines, `test:visual:changed` first renders the same stories at the merge base, on the same machine with the same browser and specs (`scripts/visual-reference.ts`): a temporary `git worktree`, its Storybook build, `VISUAL_STEPS=visual`. Any difference is the branch's. The reference is cached in `node_modules/.cache/visual-reference/<platform>/<merge base>-<harness hash>/` (the hash covers the Playwright version, its config and `tests/visual/*.ts`), so only stories it lacks are rendered again. A story new on the branch has nothing to compare with and says so.

- Native screenshots are feedback, never baselines: `--update-snapshots` is refused there. Write Linux baselines with `test:visual:canonical -- --update` or the workflow.
- The worktree shares `node_modules` when the lockfile is unchanged; otherwise it runs `npm ci` for the reference.
- `-- --no-reference` skips it (axe and the WCAG 2.2 checks only).
- Measured on an M-series Mac (10 cores), a Stepper change reaching 247 stories (516 tests): 5m 22s on the first run (2m 9s of it the reference), 3m 17s once the reference is cached. The same change in Docker under x86 emulation ran over an hour.

- **How it picks.** `scripts/affected-stories.ts` builds the gallery's module graph from the source (TypeScript's parser and resolver: imports, re-exports, `import()` and the lazy routes, `import.meta.glob`, `?raw`, JSON, CSS `@import`). A story file is affected when it reaches a changed file; its stories run in both themes with axe and the WCAG 2.2 checks. A Docs tab also reaches the Docs page frame and its own usage doc. The graph reaches outside `src/`: Foundations read the token source and `scripts/checks/`, Guides/Agents renders `CLAUDE.md`, so each maps to the pages that read it. A committed baseline that changed runs its story.
- **Barrels by name.** `import { Badge } from '../../src/index'` reaches Badge and what Badge imports, not everything `src/index.ts` re-exports. Two checks make that safe: the tree-shaking check (one import pulls in only the units it composes), and a unit test that every system stylesheet styles only its own blocks and animates only with its own keyframes, and that whatever renders a block imports its stylesheet (a stylesheet loaded on a page that doesn't render its component can't change that page).
- **Everything runs** when a change reaches every story: `tokens/`, `src/styles/`, `.storybook/`, anything `.storybook/preview.tsx` loads statically (the locale provider, the mock settings), anything the Playwright specs load (the mock seed sets every story's clock), `playwright.config.ts`, `tests/visual/`, `package.json`, the lockfile, `.nvmrc`, `tsconfig.json` and `vite.config.ts`. So does any changed file the graph doesn't reach and that isn't on the script's non-visual list (unit tests, lint fixtures, other scripts, Markdown, generated agent files, lint and Vitest config): a new kind of input runs everything until it is classified. (A module under `src/` or `docs/` that nothing imports yet runs nothing: no story can load it.) The plan names the file and the reason.
- **Checking the graph.** `npm run test:visual:changed -- --self-check` builds Storybook with `--stats-json` and fails if the bundler saw any import between repo files that the graph lacks, or if a stylesheet styles a block it doesn't own.
- Playwright gets the chosen ids in a file named by `STORY_IDS_FILE`; `tests/visual/storybook.ts` filters its stories and Docs tabs to them. Ids, not a `--grep` of titles, so no title can match another by accident.

## Deliberately not included yet

| Not yet | Add it when |
|---|---|
| **Figma Variables sync check** (export variables via the REST API or Tokens Studio, diff against `tokens/`, fail on unexplained differences) | A designer works in Figma alongside the code. Until then the JSON is the only source. |
| **Versioned package publishing** (semver, changelog, changesets, deprecation windows) | A second app consumes the system. Until then it's one folder in one repo. |
| **Codemods** for breaking changes (jscodeshift/ts-morph) | You ship a breaking change to more than one consumer. |
| **Adoption scanning** (system vs local components, `UNSAFE_` uses, disable counts per app) | A second team builds on the system and you need system-coverage numbers. |
| **Phone tab bar** | Phones become a primary surface. Until then the narrow-screen nav opens in a Drawer. |
| **AI admin controls and an audit log** (turn AI features on or off per role; record what the assistant did, for whom, and who approved it) | Real customer data reaches the assistant, or the first enterprise customer asks. Until then the assistant acts only through the person's own grant and the write path they already have. |
| **Chart components** | A page needs a trend, not just a number. Until then dashboards use Stat, Meter and tables. The chart colour tokens and their rules already exist (Foundations/Data visualisation), so a chart library or hand-drawn SVG reads `color.chart.*` from day one. |
| **Multi-brand / tenant token axis** (`data-brand` remapping primitives beside `color-scheme`) | A second brand or tenant arrives. Brand becomes another mode on the semantic tier, and the contrast and visual matrix run per brand × scheme. |

## Versions and compromises

- **TypeScript is pinned to 6.0.x.** `typescript-eslint` supports `<6.1`, so TypeScript 7 has to wait for it.
- **jsdom is on 29.** jsdom 30 requires Node ≥ 24.15.
- Layout primitives take no `ref`. The polymorphic `as` prop makes that costly to type, and layout wrappers rarely need one.
