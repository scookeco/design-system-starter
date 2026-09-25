import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { PageHeader } from './PageHeader';

const actions = (
  <>
    <Button variant="secondary">Share</Button>
    <Button>Request approval</Button>
    <Button variant="secondary" icon="more">
      More
    </Button>
  </>
);

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  args: { title: 'Records' },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {};
export const WithDescription: Story = { args: { description: 'Track every record, who owns it and where it stands.' } };
export const WithAction: Story = {
  args: { description: 'Track every record, who owns it and where it stands.', actions: <Button icon="plus">New record</Button> },
};
export const WithStatus: Story = {
  args: {
    title: 'Annual services agreement',
    status: <Badge tone="success">Active</Badge>,
    description: 'Owned by Operations · updated 2026-09-12',
  },
};
export const Record: Story = {
  args: {
    title: 'Annual services agreement',
    status: <Badge tone="success">Active</Badge>,
    description: 'Owned by Operations · updated 2026-09-12',
    actions,
  },
};
export const ActionsWrap: Story = {
  ...Record,
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
