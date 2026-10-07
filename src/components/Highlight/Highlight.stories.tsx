import type { Meta, StoryObj } from '@storybook/react-vite';
import { Center } from '../../primitives/Center/Center';
import { Text } from '../Text/Text';
import { Highlight } from './Highlight';

const meta = {
  title: 'Components/Highlight',
  component: Highlight,
  args: { children: 'sixty days’ notice' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Highlight>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The reader's own highlight (yellow): the default tone. */
export const Default: Story = {
  render: (args) => (
    <Text size="body-lg">
      Either party may end the renewal by giving <Highlight {...args} /> before the renewal date.
    </Text>
  ),
};

/** Every tone in one passage: each colour keeps one meaning, and they can show together. */
export const Tones: Story = {
  render: () => (
    <Text size="body-lg">
      The agreement <Highlight tone="ai">automatically renews</Highlight> unless either party gives <Highlight>sixty days’ notice</Highlight>{' '}
      before the renewal date, in writing to the other party’s <Highlight tone="search">notice</Highlight> address.
    </Text>
  ),
};

/** A highlight that wraps: each line keeps rounded ends, and consecutive lines keep a gap of paper between them. */
export const Wrapped: Story = {
  render: () => (
    <Center max="xs" intrinsic={false}>
      <Text size="body-lg">
        Each Party will protect <Highlight tone="ai">the other Party’s Confidential Information with at least reasonable care and use it only to perform or receive the Services</Highlight>.
      </Text>
    </Center>
  ),
};
