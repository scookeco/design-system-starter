import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useState } from 'react';
import { Stack } from '../../primitives/Stack/Stack';
import { Text } from '../Text/Text';
import { Citation, SourcesList, type Source } from './Citation';

const meta = {
  title: 'Components/Citation',
  component: Citation,
  args: { number: 1, sources: 'sources', title: 'Renews on' },
} satisfies Meta<typeof Citation>;

export default meta;
type Story = StoryObj<typeof meta>;

const sources: Source[] = [
  { title: 'Renews on', origin: 'Record field', excerpt: '15 Jan 2027', href: '#properties', hrefLabel: 'Show in record' },
  { title: 'Sam Rivera changed the status to Active', origin: 'Activity · 12 Sep 2026', href: '#activity', hrefLabel: 'Open activity' },
  { title: 'Renewal terms', origin: 'docs.example.com', excerpt: 'Either side may cancel with sixty days’ notice.', href: 'https://docs.example.com/renewals' },
];

function Answer({ initialActive }: { initialActive?: number }) {
  const id = useId();
  const [active, setActive] = useState(initialActive);
  const cite = (n: number) => <Citation number={n} sources={id} title={sources[n - 1]?.title ?? ''} onActivate={setActive} />;
  return (
    <Stack gap="md">
      <Text>
        It renews on 15 January 2027{cite(1)}, and it has been active since September{cite(2)}. Either side can cancel with sixty days’
        notice{cite(3)}.
      </Text>
      <SourcesList id={id} sources={sources} active={active} summary={<Text size="caption" tone="muted">Based on 1 record and 1 document.</Text>} />
    </Stack>
  );
}


export const InAnswer: Story = { render: () => <Answer /> };
/** The source last followed from a citation is marked current. */
export const ActiveSource: Story = { render: () => <Answer initialActive={2} /> };
export const SourcesOnly: Story = { render: () => <SourcesList id="sources-only" sources={sources} label="Sources for this answer" /> };
