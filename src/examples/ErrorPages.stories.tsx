import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotFoundPage, ServerErrorPage } from './ErrorPages';

const meta = {
  title: 'Examples/Error pages',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const NotFound: StoryObj = { render: () => <NotFoundPage /> };
export const ServerError: StoryObj = { render: () => <ServerErrorPage /> };
