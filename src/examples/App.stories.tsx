import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockApi, mockApiMeta } from '../app/mocks/storybook';
import { ExampleApp } from './App';

// The whole example app behind its route table: click through the nav, a row, a breadcrumb, and
// the pages route in place (LinkProvider). Stories whose page reads data are tagged `data`; a 404
// or 403 route queries nothing, so it isn't. (A line comment on purpose: a doc comment on the meta
// becomes docs parameters, which would replace the spread mockApiMeta parameters.)
const meta = {
  title: 'Examples/App',
  component: ExampleApp,
  tags: ['!autodocs'],
  ...mockApiMeta,
} satisfies Meta<typeof ExampleApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Records: Story = { tags: ['data'], parameters: mockApi({ url: '/records' }) };
export const RecordFromLink: Story = { tags: ['data'], parameters: mockApi({ url: '/records/r-1002/activity' }) };
/** The route table's own fallback: no route matches, so the 404 page renders inside the shell. */
export const UnknownPath: Story = { parameters: mockApi({ url: '/no/such/page' }) };
/** A route the role can't open: the guard renders the 403 page in its place (viewer at /records/new). */
export const GuardedRoute: Story = { parameters: mockApi({ url: '/records/new', role: 'viewer' }) };
