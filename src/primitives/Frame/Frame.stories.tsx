import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Frame } from './Frame';

/** A tall image (portrait), to show it being cropped to the frame rather than stretched. */
const TALL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240"><rect width="120" height="240" fill="#e0e7ff"/><rect y="100" width="120" height="40" fill="#6366f1"/></svg>',
  );

const meta = {
  title: 'Primitives/Frame',
  component: Frame,
  args: { children: <img src={TALL} alt="" /> },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Landscape: Story = {};
export const Square: Story = { args: { ratio: 'square' } };
export const Wide: Story = { args: { ratio: 'wide' } };
export const CentredContent: Story = { args: { children: 'PDF' } };
