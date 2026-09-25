import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta = {
  title: 'Components/Text',
  component: Text,
  args: { children: 'Records are reviewed every quarter by their owner.' },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};
export const BodyLarge: Story = { args: { size: 'body-lg' } };
export const Caption: Story = { args: { size: 'caption' } };
export const Muted: Story = { args: { tone: 'muted' } };
export const Numeric: Story = { args: { numeric: true, children: '1,204.50 · 98,113.00 · 7.25' } };
