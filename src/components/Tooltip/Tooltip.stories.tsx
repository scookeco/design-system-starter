import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: {
    content: 'Download the filtered list as CSV',
    children: <Button variant="secondary" icon="download">Export</Button>,
  },
  // Centred, so the tooltip has room on every side inside the viewport screenshot.
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const OpenBottom: Story = { args: { defaultOpen: true, side: 'bottom' } };
