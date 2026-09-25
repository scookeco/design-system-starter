import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // docs/: Foundations and Guides pages, rendered as stories so the visual and axe suite covers them.
  stories: ['../docs/**/*.stories.@(ts|tsx)', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
