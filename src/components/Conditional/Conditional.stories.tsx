import type { Meta, StoryObj } from '@storybook/react-vite';
import { Parties, Party } from '../Parties/Parties';
import { Callout } from '../Callout/Callout';
import { Document } from '../Document/Document';
import { DocumentCheckbox } from '../DocumentCheckbox/DocumentCheckbox';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Step } from '../Step/Step';
import { Conditional } from './Conditional';

const meta = {
  title: 'Components/Conditional',
  component: Conditional,
  args: { when: 'multiple_jobs == true', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Conditional>;

export default meta;
type Story = StoryObj<typeof meta>;

function Form({ multipleJobs }: { multipleJobs: boolean }) {
  return (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="filled" defaultValues={{ multiple_jobs: multipleJobs }}>
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <DocumentCheckbox name="multiple_jobs" label="I hold more than one job, or my spouse works" role="employee" />
        <Conditional when="multiple_jobs == true">
          <Step title="Multiple jobs or spouse works" n={2}>
            <Callout kind="instruction">Enter the total from the other jobs’ worksheets.</Callout>
            <DocumentField name="other_jobs" label="Annual pay from the other jobs" type="currency" showLabel required role="employee" />
          </Step>
        </Conditional>
        <Step title="Sign here" n={5} />
      </Document>
    </DocumentViewer>
  );
}

/** Off: Step 2 and its required field are gone until the box is checked; check it to bring them back. */
export const Default: Story = { render: () => <Form multipleJobs={false} /> };

/** On: the step shows, and its field is required. */
export const On: Story = { render: () => <Form multipleJobs /> };
