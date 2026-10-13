import type { Meta, StoryObj } from '@storybook/react-vite';
import { Parties, Party } from '../Parties/Parties';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentCheckbox } from './DocumentCheckbox';

const meta = {
  title: 'Components/DocumentCheckbox',
  component: DocumentCheckbox,
  args: { name: 'multiple_jobs', label: 'I hold more than one job' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fillable: a box to check, with its label. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <DocumentCheckbox name="multiple_jobs" label="I hold more than one job, or my spouse works" role="employee" />
      </Document>
    </DocumentViewer>
  ),
};

/** Executed: the state as it was signed. */
export const Executed: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="executed" values={{ multiple_jobs: true }}>
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <DocumentCheckbox name="multiple_jobs" label="I hold more than one job, or my spouse works" role="employee" />
      </Document>
    </DocumentViewer>
  ),
};
