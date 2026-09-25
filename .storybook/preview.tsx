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

/**
 * Container width (toolbar): wraps the story in a container of a fixed inline-size, so layouts
 * that respond to their container (AppShell, PageLayout) can be seen in each state inside the
 * fixed screenshot viewport. Widths come from the breakpoint tokens (.storybook/gallery.css):
 *
 * - narrow: half of size.breakpoint.sm — phone width; PageLayout stacks, the shell uses a drawer;
 * - medium: size.breakpoint.sm — PageLayout's regions sit side by side, the shell still uses a drawer;
 * - wide: size.breakpoint.md — the shell shows its sidebar;
 * - full: no wrapper at all (the default), so stories and their screenshots are unchanged.
 *
 * Docs tabs always render at full width.
 */
const WIDTHS = ['narrow', 'medium', 'wide', 'full'] as const;
type Width = (typeof WIDTHS)[number];

const withContainerWidth: Decorator = (Story, context) => {
  const width = context.globals.width as Width | undefined;
  if (!width || width === 'full' || !WIDTHS.includes(width) || context.viewMode === 'docs') return <Story />;
  return (
    <div className="gallery-width" data-width={width}>
      <Story />
    </div>
  );
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
    width: {
      description: 'Container width (from the breakpoint tokens)',
      toolbar: {
        title: 'Width',
        icon: 'grow',
        items: [
          { value: 'narrow', title: 'Narrow', right: 'sm ÷ 2' },
          { value: 'medium', title: 'Medium', right: 'sm' },
          { value: 'wide', title: 'Wide', right: 'md' },
          { value: 'full', title: 'Full', right: '100%' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', width: 'full' },
  decorators: [withContainerWidth, withTheme],
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
