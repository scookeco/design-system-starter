# Design system starter

Reference design system in which drift fails the build. See `README.md` for the full drift-control chain.

## Commands

```sh
npm run check          # tokens:check + typecheck + lint + test + test:rules + build. Must pass.
npm run tokens         # regenerate src/styles/tokens.css and src/tokens/tokens.ts after editing tokens/
npm run dev            # Storybook gallery
npm run test:visual    # screenshots + axe for every story, light and dark (local baselines are gitignored)
```

Work on a branch. Never commit to `main` directly.

## Repo map

- `tokens/`: DTCG source (primitive → semantic → component). The only place values live.
- `src/styles/`: layer order (`index.css`), reset, base, utilities, and the **generated** `tokens.css`. Never edit the generated file.
- `src/primitives/`: Stack, Cluster, Grid, Center, Sidebar (token-typed props).
- `src/components/`: system components. With `src/primitives/`, the only code allowed to import `radix-ui`.
- `src/examples/ListPage.tsx`: **golden example** for the list page archetype.
- `src/index.ts`: public entry point. Consumer code imports from here only.
- `fixtures/violations/`: one deliberate violation per rule. Excluded from lint; checked by `npm run test:rules`.

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
- Copy structure from src/examples (the golden page for the archetype), not from
  other screens.
- CSS: inside a declared @layer, BEM-lite classes, logical properties only,
  variants as closed data-* attributes, state via aria/native attributes,
  specificity ≤ 0,3,0, no !important, no ids.
- Every new variant, size or state gets a story. Lint, npm run check and the
  gallery (visual + axe) must pass.
- Never add an eslint-disable or stylelint-disable without a reason after "--".
```
