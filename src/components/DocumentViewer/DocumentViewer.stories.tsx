import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Stack } from '../../primitives/Stack/Stack';
import { Heading } from '../Heading/Heading';
import { Text } from '../Text/Text';
import { DataField, DocumentViewer, Highlight, type HighlightLayer } from './DocumentViewer';

const meta = {
  title: 'Components/DocumentViewer',
  component: DocumentViewer,
  args: { label: 'Master services agreement', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The generated agreement every story shows. `effective` is the merged value; empty shows the placeholder. */
function Agreement({ effective, signerName, title }: { effective?: string; signerName?: string; title?: string }) {
  return (
    <>
      <Heading level={1}>Master services agreement</Heading>
      <Text size="body-lg">
        This agreement is between <DataField value="Acme Corp" />, a Delaware corporation, and <DataField value="Globex Inc." />, a
        Washington corporation, effective{' '}
        <DataField value={effective} placeholder="the date the last party signs" announceAs="Effective date" />.
      </Text>
      <Heading level={2} size={3}>
        2. Term and renewal
      </Heading>
      <Text size="body-lg">
        The initial term is <DataField value="24 months" /> from the Effective date. The agreement then{' '}
        <Highlight tone="ai">automatically renews</Highlight> for successive 12-month terms unless either party gives{' '}
        <Highlight tone="yours" current>
          sixty days’ notice
        </Highlight>{' '}
        before the renewal date. Either party may end it for material breach that is{' '}
        <Highlight tone="yours">not cured within 30 days</Highlight> of written{' '}
        <Highlight tone="search" current>
          notice
        </Highlight>
        .
      </Text>
      <Heading level={2} size={3}>
        Signatures
      </Heading>
      <Text size="body-lg">Signed for Acme Corp by Maya Okafor, Legal counsel.</Text>
      <Text size="body-lg">
        Signed for Globex Inc. by{' '}
        <DataField value={signerName} placeholder="Signer’s name" announceAs="Signer’s name" />,{' '}
        <DataField value={title} placeholder="Title" announceAs="Title" />
      </Text>
    </>
  );
}

function Interactive({ initialLayer = 'yours' }: { initialLayer?: HighlightLayer }) {
  const [layer, setLayer] = useState<HighlightLayer>(initialLayer);
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Stack gap="md">
      <DocumentViewer label="Master services agreement" layer={layer} onLayerChange={setLayer} onHighlight={({ text }) => setSaved((list) => [...list, text])}>
        <Agreement />
      </DocumentViewer>
      {saved.length ? <Text tone="muted">Highlighted: {saved.join(' · ')}</Text> : null}
    </Stack>
  );
}

/** Your highlights showing. Select text to get the Highlight menu; the toolbar's Highlight does the same from the keyboard. */
export const Default: Story = { render: () => <Interactive /> };
/** The search layer: Find's matches, the current one stronger. Your highlights read as plain text meanwhile. */
export const SearchLayer: Story = { render: () => <Interactive initialLayer="search" /> };
/** The AI layer: the passage an answer cites. */
export const AiLayer: Story = { render: () => <Interactive initialLayer="ai" /> };

/** Placeholders for values that fill later: the effective date, the second signer's name and title. */
export const Placeholders: Story = {
  render: () => (
    <DocumentViewer label="Master services agreement">
      <Agreement />
    </DocumentViewer>
  ),
};

/** The same document once Jon Park signs: each placeholder fills in place, tinted for a moment, and is announced. */
export const PlaceholdersFilled: Story = {
  render: function Filled() {
    const [values, setValues] = useState<{ effective?: string; signerName?: string; title?: string }>({});
    useEffect(() => setValues({ effective: '14 October 2026', signerName: 'Jon Park', title: 'Operations director' }), []);
    return (
      <DocumentViewer label="Master services agreement">
        <Agreement {...values} />
      </DocumentViewer>
    );
  },
};

/** A selection ended: the menu above it offers Highlight and Copy. */
export const WithSelection: Story = {
  tags: ['!autodocs'],
  render: function Selected() {
    useEffect(() => {
      const target = document.querySelector('.document-viewer__paper p');
      if (!target?.firstChild) return;
      const range = document.createRange();
      range.setStart(target.firstChild, 5);
      range.setEnd(target.firstChild, 19);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }, []);
    return <Interactive />;
  },
};
