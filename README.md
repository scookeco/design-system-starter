# Design system starter

A small, working design system in which **drift fails the build**. Tokens, components, layout primitives, a gallery and one golden example page. Every link from the token source to the rendered pixel is either generated from the link before it or checked by a machine. Nothing in the chain depends on someone remembering to review it.

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
src/primitives/         Stack, Cluster, Grid, Center, Sidebar
src/components/         the components; the only place (with primitives) Radix is imported
src/internal/           closed-API helpers (Closed<>, UNSAFE_ escape hatch)
src/examples/           golden example: list page archetype (also a consumer lint target)
src/index.ts            public entry point
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
| Escape hatches are visible | `no-restricted-syntax` flags `className`, `style` and `UNSAFE_*` in consumer code | `eslint.config.js` |
| Exceptions carry a reason | `eslint-comments/require-description`, unused disables are errors; Stylelint `reportDescriptionlessDisables` and `reportNeedlessDisables` | both configs |
| The rules are actually loaded | `test:rules` (every rule has a fixture, fixtures must not be ignored or fail to parse, clean controls must pass) | `scripts/test-rules.ts` |
| Gallery: every variant/size/state renders correctly in light and dark | Playwright screenshots against Linux baselines | `tests/visual/stories.spec.ts` |
| Gallery is accessible | axe (WCAG 2.2 A/AA) on every story, both themes | `tests/visual/stories.spec.ts` |
| Agents know the rules | UI rules block | `CLAUDE.md` |

### Rules worth knowing

- **Allowed literals** in token-only properties: `inherit`, `currentColor`, `transparent`, `none`, `auto`, `0`, `1px`, `100%`. Anything else is a token.
- **Transitions are written as longhands.** `transition-property` holds the property names; `transition-duration` and `transition-timing-function` take tokens. The shorthand is rejected because it mixes property names with values.
- **Component-local custom properties** (`--button-bg`) must point at a token (`var(--…)`) or an allowed keyword.
- **Component internals may use Flexbox/Grid.** Arranging a page is the layout primitives' job. This is the "less restrictive" policy. The golden example has no CSS at all.
- **Escape hatch format.** In consumer code every `UNSAFE_className`/`UNSAFE_style` needs:
  ```tsx
  {/* eslint-disable-next-line no-restricted-syntax -- <reason>; owner: <team>; remove when: <condition> */}
  ```
  Count these disables. A rising count means drift, and a repeated override means a variant is missing.

## Theming

Semantic colour tokens hold both values as `light-dark(light, dark)`. `:root` sets `color-scheme: light`, and `data-theme="dark"` on `<html>` switches to dark. Components contain no theme rules at all. The product ships light, and turning dark on is a one-line change. Contrast is tested in both themes, and the gallery captures both.

## Adding a component: walk the decision ladder

Stop at the first yes:

1. **Is it a new page?** Copy the structure of the golden example (`src/examples/ListPage.tsx`) and compose existing parts. No new component.
2. **Does an existing component need a new look?** Add a **variant** (a new value in its closed `data-*` vocabulary, plus a story). A new status extends the status-to-tone map; it doesn't add a badge.
3. **Is it a genuinely new region or intent?** Add a **component** in `src/components/<Name>/`:
   - `Name.tsx`: props typed with `Closed<…>` (no `className`/`style`), a required accessible name, variants as closed unions, and state via aria/native attributes. Wrap Radix here if you need behaviour. Never expose `asChild`.
   - `Name.css`: inside `@layer components`, BEM-lite classes, in the order block, parts, variants, states. Tokens only.
   - `Name.stories.tsx`: one story per variant, size and state. The visual and axe suite picks them up automatically.
   - Export it from `src/components/index.ts`.
4. **A new primitive?** The highest bar: domain-agnostic, token-driven, impossible to express as a composition. It changes tokens, component styles and `CLAUDE.md` in the same PR.

Then run `npm run check`, run the baseline workflow on the branch, and review the new screenshots in the PR diff.

## Adding a token

1. Pick the tier. **Semantic** is almost always right (`color.fg.muted`, `space.gap.md`). Add a **primitive** only for a new raw value. Add a **component** token only when one part needs its own override hook.
2. Edit `tokens/<tier>/*.json` (DTCG: `$type`, `$value`, aliases as `{path.to.token}`). Keys are lowercase kebab-case. A semantic colour needs `"$extensions": { "starter.modes": { "dark": "{…}" } }`.
3. `npm run tokens`, and commit the JSON together with the regenerated `src/styles/tokens.css` and `src/tokens/tokens.ts`.
4. If it is a new text/background pair, add it to `tests/unit/contrast.test.ts`.
5. Removing or renaming a semantic token is a breaking change. Keep an alias for a deprecation window.

## Visual baselines

- Screenshots live at `tests/visual/__screenshots__/{platform}/<story-id>--<theme>.png`. Only `linux/` is committed. It is produced by the **Update visual baselines** workflow on `ubuntu-24.04`, the same image CI compares on.
- Without Docker you can't produce Linux baselines locally, and that's fine. Locally, `npm run test:visual:update` writes `darwin/` baselines (gitignored) so you can diff your own changes before pushing.
- In CI, `updateSnapshots: 'none'` applies. While no Linux baselines exist, screenshot tests skip with a notice. Once any exist, a story without a baseline fails, and so does any pixel difference.
- After an intended visual change: run the workflow on your branch, re-run CI, and review the updated PNGs in the PR.
- Stories tagged `modal-open` (open Dialog or Select) relax only axe's `aria-hidden-focus`. Radix hides the page behind a focus-trapped modal layer, and axe can't see the trap.

## Deliberately not included yet

| Not yet | Add it when |
|---|---|
| **Figma Variables sync check** (export variables via the REST API or Tokens Studio, diff against `tokens/`, fail on unexplained differences) | A designer works in Figma alongside the code. Until then the JSON is the only source. |
| **Versioned package publishing** (semver, changelog, changesets, deprecation windows) | A second app consumes the system. Until then it's one folder in one repo. |
| **Codemods** for breaking changes (jscodeshift/ts-morph) | You ship a breaking change to more than one consumer. |
| **Adoption scanning** (system vs local components, `UNSAFE_` uses, disable counts per app) | A second team builds on the system and you need system-coverage numbers. |
| **Multi-brand / tenant token axis** (`data-brand` remapping primitives beside `color-scheme`) | A second brand or tenant arrives. Brand becomes another mode on the semantic tier, and the contrast and visual matrix run per brand × scheme. |

## Versions and compromises

- **TypeScript is pinned to 6.0.x.** `typescript-eslint` supports `<6.1`, so TypeScript 7 has to wait for it.
- **jsdom is on 29.** jsdom 30 requires Node ≥ 24.15.
- Layout primitives take no `ref`. The polymorphic `as` prop makes that costly to type, and layout wrappers rarely need one.
