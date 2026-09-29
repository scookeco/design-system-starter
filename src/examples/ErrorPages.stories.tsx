import type { Meta, StoryObj } from '@storybook/react-vite';
import { ForbiddenPage, NotFoundPage, RenderErrorPage, ServerErrorPage } from './ErrorPages';

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
/** A page that failed to render: the route's error boundary shows this in its place, inside the shell. */
export const RenderError: StoryObj = { render: () => <RenderErrorPage current="/records" onRetry={() => undefined} /> };
/** A page whose code failed to load (a dropped connection, a deploy): Try again fetches it again. */
export const LoadError: StoryObj = { render: () => <RenderErrorPage current="/records" cause="load" onRetry={() => undefined} /> };
/** Try again failed too: the next step is a full reload, and focus moves to it (the pressed Try again is gone). */
export const LoadErrorRepeated: StoryObj = {
  render: () => <RenderErrorPage current="/records" cause="load" repeated onRetry={() => undefined} onReload={() => undefined} />,
};
