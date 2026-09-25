import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Cover } from './Cover';

const meta = {
  title: 'Primitives/Cover',
  component: Cover,
  args: {
    minBlockSize: 'viewport',
    header: <DemoBox>Header: pinned to the top</DemoBox>,
    footer: <DemoBox>Footer: pinned to the bottom</DemoBox>,
    children: <DemoBox>Centred in the space that is left</DemoBox>,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Cover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderAndFooter: Story = {};
export const CentredOnly: Story = { args: { header: undefined, footer: undefined } };
export const TightGap: Story = { args: { gap: 'xs' } };
