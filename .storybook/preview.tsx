import type { Decorator, Preview } from '@storybook/react-vite';
import { lazy, Suspense } from 'react';
import '../src/styles/index.css';
import './gallery.css';
import '../docs/docs.css';

/*
 * Loaded lazily on purpose. A static import would pull component stylesheets into chunks that
 * load before this file's CSS, so `@layer components` would be declared before the layer order
 * in src/styles/index.css and lose to the reset layer.
 */
const LazyDocsPage = lazy(async () => ({ default: (await import('./DocsPage')).DocsPage }));
const DocsPage = () => (
  <Suspense fallback={null}>
    <LazyDocsPage />
  </Suspense>
);

/**
 * The visual suite (tests/visual) captures every story in both themes via the
 * `theme` global in the URL. Theme lives on <html>, not on a story wrapper: Dialog, Select, Tooltip and Toast
 * portal to <body>, and must follow the theme too.
 *
 * Docs tabs are always light: Storybook draws the docs page itself in its light theme, so
 * system text in dark mode would sit light-on-white. Dark mode is covered story by story.
 */
const withTheme: Decorator = (Story, context) => {
  const dark = context.globals.theme === 'dark' && context.viewMode !== 'docs';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withTheme],
  // Every component, layout and primitive gets a Docs tab. Examples, Foundations, Guides and
  // stories tagged `modal-open` opt out with '!autodocs' (an open modal would cover the docs page).
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true },
    docs: { page: DocsPage },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Colour', 'Typography', 'Spacing, sizing and radius', 'Elevation and motion', 'Icons'],
          'Guides',
          ['Getting started', 'Principles', 'Decision ladder', 'Layout', 'Page archetypes', 'Accessibility', 'Content', 'Escape hatches'],
          'Components',
          'Primitives',
          'Layouts',
          'Examples',
        ],
      },
    },
  },
};

export default preview;
