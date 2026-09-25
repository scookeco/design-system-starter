import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Stack } from '../Stack/Stack';
import { Imposter } from './Imposter';

const content = (
  <Stack gap="sm">
    {Array.from({ length: 6 }, (_, i) => (
      <DemoBox key={i}>Row {i + 1}</DemoBox>
    ))}
  </Stack>
);

const meta = {
  title: 'Primitives/Imposter',
  component: Imposter,
  args: { children: content, overlay: <DemoBox>No data for this range</DemoBox>, inertContent: true },
} satisfies Meta<typeof Imposter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WideMargin: Story = { args: { margin: 'xl' } };
export const Contained: Story = {
  args: {
    overlayLabel: 'Release notes',
    overlay: (
      <Stack gap="xs">
        {Array.from({ length: 12 }, (_, i) => (
          <DemoBox key={i}>A long overlay, line {i + 1}</DemoBox>
        ))}
      </Stack>
    ),
  },
};
export const NoOverlay: Story = { args: { overlay: undefined } };
