import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = {
  title: 'Components/Kbd',
  component: Kbd,
  args: { keys: 'mod+k', platform: 'mac' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `mod` is ⌘ on a Mac: symbols, no separators, each with a spoken name for screen readers. */
export const Mac: Story = {};
/** Everywhere else `mod` is Ctrl, and modifiers are words. */
export const WindowsAndLinux: Story = { args: { platform: 'other' } };
export const ShiftChord: Story = { args: { keys: 'mod+shift+p' } };
/** One key named as printed (`children`), for a hint in running text. */
export const SingleKey: Story = { args: { keys: undefined, children: 'Tab' } };
/** A single-key shortcut (WCAG 2.2 SC 2.1.4: people can turn these off in the shortcuts overlay). */
export const SingleKeyShortcut: Story = { args: { keys: 'e' } };
/** A sequence: press G, then I. */
export const Sequence: Story = { args: { keys: 'g i' } };
export const NamedKeys: Story = { args: { keys: 'shift+enter' } };
/** Keys by name in a hint: a combination is one Kbd per key. */
export const Combination: Story = {
  render: () => (
    <p>
      Press <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line.
    </p>
  ),
};
/** The same hint in notation: one Kbd, one cap per key, for the platform. */
export const CombinationInNotation: Story = {
  render: () => (
    <p>
      Press <Kbd keys="shift+enter" platform="mac" /> for a new line.
    </p>
  ),
};
