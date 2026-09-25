import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const EXAMPLES = [
  { context: 'Primary button', write: 'Create record', avoid: 'Submit, OK, Yes' },
  { context: 'Confirm dialog button', write: 'Delete 3 records', avoid: 'Confirm' },
  { context: 'Field error', write: 'Enter an amount greater than 0.', avoid: 'Invalid input!' },
  { context: 'Page error', write: 'Records didn’t load. Check your connection and try again.', avoid: 'Oops, something went wrong' },
  { context: 'Success toast', write: 'Record saved', avoid: 'Your record has been saved successfully!' },
  { context: 'Link', write: 'View billing history', avoid: 'Click here' },
] as const;

function Content() {
  return (
    <DocPage title="Content" lead="Plain, specific and calm. The words are part of the interface: a vague label or a blaming error is a defect like any other.">
      <DocSection title="Buttons and links">
        <Rules
          items={[
            <>Start with a verb and name the thing: “Create record”, “Export CSV”, “Invite user”.</>,
            <>A confirm button repeats the verb and noun from the dialog title, so it reads correctly on its own.</>,
            <>Link text says where it goes. Never “click here” or a bare “learn more”.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Errors">
        <Rules
          items={[
            <>What happened, then how to fix it, in one or two short sentences.</>,
            <>Put it where the problem is: under the field, on the row, or in a page Banner for page-level failures.</>,
            <>Never blame the user, never show a raw code alone, and never clear what they typed.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Casing and words">
        <Rules
          items={[
            <>Sentence case everywhere: buttons, headings, labels, tabs, menu items.</>,
            <>One word per concept. If it’s a “workspace”, it’s never also a “team” somewhere else.</>,
            <>Avoid “please”, “successfully”, “oops” and exclamation marks. Address the user as “you”.</>,
            <>Labels are always visible. A placeholder is a hint, never the label.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Examples">
        <Table caption="Write this, not that">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Where</TableHeaderCell>
              <TableHeaderCell>Write</TableHeaderCell>
              <TableHeaderCell>Not</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {EXAMPLES.map((e) => (
              <TableRow key={e.context}>
                <TableCell rowHeader>{e.context}</TableCell>
                <TableCell>{e.write}</TableCell>
                <TableCell>{e.avoid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Content', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const ContentGuide: StoryObj = { name: 'Content', render: () => <Content /> };
