import type { Meta, StoryObj } from '@storybook/react-vite';
import { createFormatter } from '../../format/format';
import { Stack } from '../../primitives/Stack/Stack';
import { Text } from './Text';

/** Stories format with the system's formats, like apps do (apps use useFormat()). */
const f = createFormatter({ locale: 'en-US', timeZone: 'UTC' });

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
export const DefinitionList: Story = {
  render: () => (
    <Stack as="dl" gap="sm">
      <Stack gap="2xs">
        <Text as="dt" size="caption" tone="muted">
          Owner
        </Text>
        <Text as="dd">Operations</Text>
      </Stack>
      <Stack gap="2xs">
        <Text as="dt" size="caption" tone="muted">
          Renewal date
        </Text>
        <Text as="dd" numeric>
          {f.date('2027-01-31')}
        </Text>
      </Stack>
    </Stack>
  ),
};
