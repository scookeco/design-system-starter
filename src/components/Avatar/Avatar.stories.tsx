import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

// A self-contained image, so the gallery never depends on the network.
const PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#c7d2fe"/><circle cx="20" cy="16" r="7" fill="#4338ca"/><rect x="8" y="26" width="24" height="16" rx="8" fill="#4338ca"/></svg>',
  );

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: { name: 'Sam Rivera' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};
export const SingleName: Story = { args: { name: 'Operations' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const WithImage: Story = { args: { src: PHOTO } };
export const Decorative: Story = { args: { decorative: true } };
