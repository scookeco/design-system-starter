import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Heading } from '../Heading/Heading';
import { Parties, Party } from '../Parties/Parties';
import { RoleRegion } from './RoleRegion';

const meta = {
  title: 'Components/RoleRegion',
  component: RoleRegion,
  args: { role: 'employer', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RoleRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

function W4({ actor }: { actor?: string }) {
  return (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="filled" actor={actor} headingLevel={3}>
        <Parties>
          <Party role="employee" name="Employee" />
          <Party role="employer" name="Employer" />
        </Parties>
        <DocumentField name="first_name" label="First name and middle initial" showLabel role="employee" />
        <RoleRegion role="employer">
          <Heading level={2} size={4}>
            Employers only
          </Heading>
          <DocumentField name="employer_name" label="Employer’s name and address" showLabel />
          <DocumentField name="ein" label="Employer identification number (EIN)" type="ein" showLabel />
        </RoleRegion>
      </Document>
    </DocumentViewer>
  );
}

/** The employer's block: its fields are the employer's. Everyone's fields are open when no party is acting. */
export const Default: Story = { render: () => <W4 /> };

/** The employee acting: the employer's fields read as text (blank lines) until it is the employer's turn. */
export const EmployeeActing: Story = { render: () => <W4 actor="employee" /> };
