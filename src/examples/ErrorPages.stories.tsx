import type { Meta, StoryObj } from '@storybook/react-vite';
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from './ErrorPages';

const meta = {
  title: 'Examples/Error pages',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const NotFound: StoryObj = { render: () => <NotFoundPage /> };
export const ServerError: StoryObj = { render: () => <ServerErrorPage /> };
/** A page this person's role can't open: the route guard renders this in the page's place. */
export const Forbidden: StoryObj = {
  render: () => <ForbiddenPage current="/records" reason="You have view-only access, so you can’t create records. Ask a workspace admin for editor access." />,
};
