import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // docs/: Foundations and Guides pages, rendered as stories so the visual and axe suite covers them.
  stories: ['../docs/**/*.stories.@(ts|tsx)', '../src/**/*.stories.@(ts|tsx)', '../tests/visual/fixtures/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', 'msw-storybook-addon'],
  // The mock API's service worker (mockServiceWorker.js). Kept under .storybook so the library
  // build never copies it into dist/.
  staticDirs: ['./public'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
