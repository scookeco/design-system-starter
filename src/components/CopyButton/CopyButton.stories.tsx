import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CopyButton } from './CopyButton';

const meta = {
  title: 'Components/CopyButton',
  component: CopyButton,
  args: { text: 'wsk_3f9a1c7e20b4', accessibleName: 'Copy API key' },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = {};
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Medium: Story = { args: { size: 'md' } };
export const CustomLabels: Story = { args: { label: 'Copy link', accessibleName: undefined, copiedLabel: 'Link copied', text: 'https://example.com/share/8f2k' } };

/**
 * PILOT (Storybook Vitest addon): the "copies, announces and reverts" unit test as a play function.
 * Copies, announces “Copied” in a live region present from mount, and reverts.
 */
export const CopiesAndReverts: Story = {
  args: { text: 'abc', revertAfter: 300 },
  beforeEach: () => {
    const writeText = fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    return () => Reflect.deleteProperty(navigator, 'clipboard');
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('');
    await userEvent.click(canvas.getByRole('button', { name: 'Copy API key' }));
    await expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc');
    await expect(status).toHaveTextContent('Copied');
    await waitFor(() => expect(status).toHaveTextContent(''));
    await expect(canvas.getByRole('button', { name: 'Copy API key' })).toBeInTheDocument();
  },
};

/** PILOT: the "says so when the clipboard is refused" unit test as a play function. */
export const ClipboardRefused: Story = {
  args: { accessibleName: undefined },
  beforeEach: () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    return () => Reflect.deleteProperty(navigator, 'clipboard');
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(canvas.getByRole('status')).toHaveTextContent(/Couldn’t copy/);
  },
};
