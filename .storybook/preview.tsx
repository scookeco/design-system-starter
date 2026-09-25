import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/styles/index.css';
import './gallery.css';

/**
 * The visual suite (tests/visual) captures every story in both themes via the
 * `theme` global in the URL. Theme lives on <html>, not on a story wrapper: Dialog, Select, Tooltip and Toast
 * portal to <body>, and must follow the theme too.
 */
const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = context.globals.theme === 'dark' ? 'dark' : 'light';
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
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
};

export default preview;
