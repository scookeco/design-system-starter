import type { Decorator, Preview } from '@storybook/react-vite';
import { lazy, Suspense } from 'react';
import '../src/styles/index.css';
import './gallery.css';
import '../docs/docs.css';
// CSS-free on purpose (no component, no stylesheet): safe to import statically, unlike system components.
import { LocaleProvider } from '../src/format/LocaleProvider';
import { mswLoader } from 'msw-storybook-addon/csf3';
// Import-free on purpose: the mock server's latency and failure settings.
import { configureMocks } from '../src/app/mocks/config';

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

/** Formatting locales in the toolbar, each with a time zone that belongs to it. */
const LOCALES: Record<string, { timeZone: string; dir: 'ltr' | 'rtl' }> = {
  'en-US': { timeZone: 'UTC', dir: 'ltr' },
  'de-DE': { timeZone: 'Europe/Berlin', dir: 'ltr' },
  'ja-JP': { timeZone: 'Asia/Tokyo', dir: 'ltr' },
  'ar-EG': { timeZone: 'Africa/Cairo', dir: 'rtl' },
};

/**
 * Every story formats through LocaleProvider with the toolbar's locale. Arabic also sets dir="rtl"
 * on the story root: the system's CSS is logical-properties only, so layouts mirror. Portalled
 * overlays (Dialog, Menu) render outside the root and stay left-to-right.
 */
const withLocale: Decorator = (Story, context) => {
  const locale = typeof context.globals.locale === 'string' && context.globals.locale in LOCALES ? context.globals.locale : 'en-US';
  const settings = LOCALES[locale] ?? { timeZone: 'UTC', dir: 'ltr' };
  const root = document.getElementById('storybook-root');
  if (root && context.viewMode !== 'docs') {
    root.dir = settings.dir;
    root.lang = locale;
  }
  return (
    <LocaleProvider locale={locale} timeZone={settings.timeZone}>
      <Story />
    </LocaleProvider>
  );
};

/**
 * The mock API follows the Latency and Failures toolbars. Failures are real HTTP 500 responses
 * through the real client, so error states are the ones users would see. The visual suite pins
 * both to 0 in the URL.
 */
const withMockSettings: Decorator = (Story, context) => {
  configureMocks({ latencyMs: Number(context.globals.latency ?? 0) || 0, failureRate: Number(context.globals.failure ?? 0) || 0 });
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
    locale: {
      description: 'Formatting locale and time zone',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en-US', title: 'English (US) · UTC' },
          { value: 'de-DE', title: 'Deutsch (DE) · Berlin' },
          { value: 'ja-JP', title: '日本語 (JP) · Tokyo' },
          { value: 'ar-EG', title: 'العربية (EG) · Cairo · RTL' },
        ],
        dynamicTitle: true,
      },
    },
    latency: {
      description: 'Mock API latency',
      toolbar: {
        title: 'Latency',
        icon: 'timer',
        items: [
          { value: '0', title: 'Instant' },
          { value: '400', title: 'Realistic (400 ms)' },
          { value: '2000', title: 'Slow (2 s)' },
        ],
        dynamicTitle: true,
      },
    },
    role: {
      description: 'Your role in the mock workspace (a story that sets its own role wins)',
      toolbar: {
        title: 'Role',
        icon: 'user',
        items: [
          { value: 'viewer', title: 'Viewer' },
          { value: 'editor', title: 'Editor' },
          { value: 'admin', title: 'Admin' },
        ],
        dynamicTitle: true,
      },
    },
    anotherUser: {
      description: 'Push a change by another person in the workspace, through the live channel (data stories)',
      toolbar: {
        title: 'Another user…',
        icon: 'users',
        items: [
          { value: 'none', title: 'Another user…' },
          { value: 'edit', title: 'Edits this record (or the first row)' },
          { value: 'add', title: 'Adds a record' },
          { value: 'delete', title: 'Deletes this record (or the first row)' },
        ],
      },
    },
    failure: {
      description: 'Mock API failure rate',
      toolbar: {
        title: 'Failures',
        icon: 'alert',
        items: [
          { value: '0', title: 'No failures' },
          { value: '0.2', title: '1 in 5 requests fail' },
          { value: '1', title: 'Every request fails' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', width: 'full', locale: 'en-US', latency: '400', failure: '0', role: 'admin', anotherUser: 'none' },
  loaders: [mswLoader()],
  decorators: [withContainerWidth, withTheme, withLocale, withMockSettings],
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
          ['Colour', 'Data visualisation', 'Typography', 'Spacing, sizing and radius', 'Breakpoints and layout grid', 'Elevation and motion', 'Layers', 'Focus and target size', 'Icons'],
          'Guides',
          ['Getting started', 'Principles', 'Decision ladder', 'Layout', 'Page archetypes', 'Data', 'Accessibility', 'Accessibility conformance', 'Accessibility statement', 'Content', 'Forms', 'Keyboard and power users', 'Motion', 'Theming and adding a brand', 'Escape hatches', 'Contributing and versioning', 'Testing', 'Agents'],
          'Components',
          'Primitives',
          'Layouts',
          'Utilities',
          'Examples',
        ],
      },
    },
  },
};

export default preview;
