import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoNarrow } from '../../../.storybook/DemoBox';
import { SplitView } from './SplitView';

const list = <DemoBox>List: the rows to move through (j and k in the inbox).</DemoBox>;
const detail = <DemoBox>Detail: the selected row, beside the list.</DemoBox>;

const meta = {
  title: 'Layouts/SplitView',
  component: SplitView,
  args: { list, detail, listLabel: 'Conversations', detailLabel: 'Conversation' },
} satisfies Meta<typeof SplitView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both panes side by side, the list at 40%. Drag the divider, click it to step through widths, or focus it and use ← →. */
export const Default: Story = {};
export const WideList: Story = { args: { defaultListSize: 55 } };
/** A narrow container shows one pane: the list until something is opened. */
export const NarrowList: Story = {
  args: { show: 'list', onBack: () => undefined },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
/** Narrow, with an item open: the detail, and Back to the list above it. */
export const NarrowDetail: Story = {
  args: { show: 'detail', onBack: () => undefined, backLabel: 'All conversations' },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
