/**
 * PILOT (Storybook Vitest addon): project annotations for `npm run test:stories`
 * (vitest.storybook.config.ts). The gallery's own preview, plus the determinism the Playwright
 * harness pins in tests/visual/storybook.ts where Vitest has an equivalent: the mock API answers
 * instantly and never fails, and the role is admin. Not reproduced here: the frozen clock, view
 * transitions off, and waiting for settled queries, fonts and a stable height.
 */
import * as a11yAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as previewAnnotations from './preview';

// The suite's axe tags (WCAG_TAGS in tests/visual/storybook.ts), so the two runs check the same rules.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

setProjectAnnotations([
  a11yAnnotations,
  previewAnnotations,
  {
    initialGlobals: { ...previewAnnotations.default.initialGlobals, latency: '0', failure: '0', role: 'admin', theme: 'light' },
    parameters: { a11y: { test: 'error', options: { runOnly: { type: 'tag', values: WCAG_TAGS } } } },
    // MODAL_OPEN_EXCEPTIONS in tests/visual/storybook.ts: an open modal layer hides the page behind
    // it from assistive technology and traps focus, which axe's aria-hidden-focus can't see.
    beforeEach: ({ tags, parameters }) => {
      if (!tags.includes('modal-open')) return;
      parameters.a11y = { ...parameters.a11y, config: { ...parameters.a11y?.config, rules: [...(parameters.a11y?.config?.rules ?? []), { id: 'aria-hidden-focus', enabled: false }] } };
    },
  },
]);
