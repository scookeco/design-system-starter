import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiMarker } from './AiMarker';

const meta = {
  title: 'Components/AiMarker',
  component: AiMarker,
} satisfies Meta<typeof AiMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Badge: Story = {};
export const Inline: Story = { args: { variant: 'inline' } };
export const CustomLabel: Story = { args: { children: 'Drafted with AI · not reviewed' } };
