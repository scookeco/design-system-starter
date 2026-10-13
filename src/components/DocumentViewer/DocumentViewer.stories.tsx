import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Stack } from '../../primitives/Stack/Stack';
import { Clause } from '../Clause/Clause';
import { Heading } from '../Heading/Heading';
import { Highlight } from '../Highlight/Highlight';
import { Text } from '../Text/Text';
import { Document } from '../Document/Document';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from './DocumentViewer';

const meta = {
  title: 'Components/DocumentViewer',
  component: DocumentViewer,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The values merged into the agreement; the effective date and the second signer's fill later. */
const MERGED = { vendor: 'Acme Corp', customer: 'Globex Inc.', initial_term: '24 months' };
const SIGNED = { effective: '14 October 2026', signer_name: 'Jon Park', signer_title: 'Operations director' };

/** The generated agreement every story shows: values by name from the Document; an empty one shows its placeholder. */
function Agreement() {
  return (
    <>
      <Heading level={1}>Master services agreement</Heading>
      <Text size="body-lg">
        This agreement is between <DocumentField name="vendor" label="Vendor" />, a Delaware corporation, and <DocumentField name="customer" label="Customer" />, a
        Washington corporation, effective{' '}
        <DocumentField name="effective" label="Effective date" placeholder="the date the last party signs" announceAs="Effective date" />.
      </Text>
      <Clause id="term" title="Term and renewal">
        <Text size="body-lg">
          The initial term is <DocumentField name="initial_term" label="Initial term" /> from the Effective date. The agreement then{' '}
          <Highlight tone="ai">automatically renews</Highlight> for successive 12-month terms unless either party gives{' '}
          <Highlight>sixty days’ notice</Highlight>{' '}
          before the renewal date. Either party may end it for material breach that is{' '}
          <Highlight>not cured within 30 days</Highlight> of written{' '}
          <Highlight tone="search">notice</Highlight>
          .
        </Text>
      </Clause>
      <Heading level={2} size={3}>
        Signatures
      </Heading>
      <Text size="body-lg">Signed for Acme Corp by Maya Okafor, Legal counsel.</Text>
      <Text size="body-lg">
        Signed for Globex Inc. by{' '}
        <DocumentField name="signer_name" label="Signer’s name" placeholder="Signer’s name" announceAs="Signer’s name" />,{' '}
        <DocumentField name="signer_title" label="Title" placeholder="Title" announceAs="Title" />
      </Text>
    </>
  );
}

function Interactive() {
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Stack gap="md">
      <DocumentViewer onHighlight={({ text }) => setSaved((list) => [...list, text])}>
        <Document label="Master services agreement" values={MERGED}>
          <Agreement />
        </Document>
      </DocumentViewer>
      {saved.length ? <Text tone="muted">Highlighted: {saved.join(' · ')}</Text> : null}
    </Stack>
  );
}

/** The reader's highlights, a Find match and an AI citation together. Select text to get the Highlight menu; H does the same from the keyboard. The paper is at least a page tall. */
export const Default: Story = { render: () => <Interactive /> };

/** Placeholders for values that fill later: the effective date, the second signer's name and title. */
export const Placeholders: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement" values={MERGED}>
        <Agreement />
      </Document>
    </DocumentViewer>
  ),
};

/** The same document once Jon Park signs: each placeholder fills in place, tinted for a moment, and is announced. */
export const PlaceholdersFilled: Story = {
  render: function Filled() {
    const [values, setValues] = useState<Record<string, string>>(MERGED);
    useEffect(() => setValues({ ...MERGED, ...SIGNED }), []);
    return (
      <DocumentViewer>
        <Document label="Master services agreement" values={values}>
          <Agreement />
        </Document>
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
