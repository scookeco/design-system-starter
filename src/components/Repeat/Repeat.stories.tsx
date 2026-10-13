import type { Meta, StoryObj } from '@storybook/react-vite';
import { Parties, Party } from '../Parties/Parties';
import { Document } from '../Document/Document';
import { DocumentCheckbox } from '../DocumentCheckbox/DocumentCheckbox';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentFieldset } from '../DocumentFieldset/DocumentFieldset';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Repeat } from './Repeat';

const meta = {
  title: 'Components/Repeat',
  component: Repeat,
  args: { name: 'employment_history', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Repeat>;

export default meta;
type Story = StoryObj<typeof meta>;

function History({ lifecycle }: { lifecycle: 'filled' | 'generated' }) {
  return (
    <DocumentViewer>
      <Document
        label="Job application"
        lifecycle={lifecycle}
        defaultValues={{ employment_history: [{ employer: 'Acme Corp', start: '2021-03-01', current: true }, { employer: 'Globex Inc.', start: '2017-06-12', end: '2021-02-26' }] }}
      >
        <Parties>
          <Party role="applicant" name="Applicant" />
        </Parties>
        <Repeat name="employment_history" min={1} max={5} addLabel="Add employer">
          <DocumentFieldset legend="Employer" role="applicant">
            <DocumentField name="employer" label="Employer" showLabel required />
            <DocumentField name="start" label="Start" type="date" showLabel required />
            <DocumentField name="end" label="End" type="date" showLabel />
            <DocumentCheckbox name="current" label="Current employer" />
          </DocumentFieldset>
        </Repeat>
      </Document>
    </DocumentViewer>
  );
}

/** Fillable: one fieldset per employer, added up to five and removed down to one. */
export const Default: Story = { render: () => <History lifecycle="filled" /> };

/** Generated: the rows as text, no buttons. */
export const Generated: Story = { render: () => <History lifecycle="generated" /> };
