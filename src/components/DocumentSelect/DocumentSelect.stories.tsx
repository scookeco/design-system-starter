import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentOption } from '../DocumentRadioGroup/DocumentRadioGroup';
import { Text } from '../Text/Text';
import { DocumentSelect } from './DocumentSelect';

const meta = {
  title: 'Components/DocumentSelect',
  component: DocumentSelect,
  args: { name: 'law', label: 'Governing law', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function Clause({ lifecycle }: { lifecycle: 'filled' | 'generated' }) {
  return (
    <DocumentViewer>
      <Document label="Master services agreement" lifecycle={lifecycle} defaultValues={{ law: 'WA' }}>
        <Text size="body-lg">
          This Agreement is governed by the laws of the State of{' '}
          <DocumentSelect name="law" label="Governing law">
            <DocumentOption value="WA">Washington</DocumentOption>
            <DocumentOption value="NY">New York</DocumentOption>
            <DocumentOption value="DE">Delaware</DocumentOption>
          </DocumentSelect>
          .
        </Text>
      </Document>
    </DocumentViewer>
  );
}

/** Fillable: a native select in the sentence. */
export const Default: Story = { render: () => <Clause lifecycle="filled" /> };

/** Generated: the chosen option's words. */
export const Generated: Story = { render: () => <Clause lifecycle="generated" /> };
