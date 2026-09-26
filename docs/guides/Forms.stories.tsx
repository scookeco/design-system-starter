import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const CONTROLS = [
  { name: 'TextField', id: 'components-textfield--default', choose: 'Short free text, email, numbers, a password (with its show-password toggle).', avoid: 'More than a line (Textarea), or a value from a known list (Select, RadioGroup).' },
  { name: 'Textarea', id: 'components-textarea--default', choose: 'Free text over a line: a description, a comment.', avoid: 'A single value.' },
  { name: 'SearchField', id: 'components-searchfield--empty', choose: 'Filtering a list on the page as you type, with a clear button.', avoid: 'A form answer (TextField).' },
  { name: 'Select', id: 'components-select--placeholder', choose: 'One value from a long or unfamiliar list (six or more).', avoid: 'Two to five options people should compare at a glance (RadioGroup).' },
  { name: 'Combobox', id: 'components-combobox--empty', choose: 'One value from a list too long to scan: type to narrow it (an owner, an account).', avoid: 'A short fixed list (Select).' },
  { name: 'MultiSelect', id: 'components-multiselect--empty', choose: 'Several values from a longer list, shown as removable chips: event types, tags.', avoid: 'A handful of independent options (Checkboxes).' },
  { name: 'DatePicker', id: 'components-datepicker--empty', choose: 'A calendar date, typed in the reader’s order or picked; ISO in and out.', avoid: 'A moment in time with an hour (a date and a time, stored as an instant).' },
  { name: 'DateRangePicker', id: 'components-daterangepicker--empty', choose: 'A start and an end date in one field and one calendar.', avoid: 'Preset periods (SegmentedControl).' },
  { name: 'NumberField', id: 'components-numberfield--empty', choose: 'Quantities, amounts (integer minor units with a currency) and percentages, in the reader’s format.', avoid: 'Numbers that aren’t quantities: phone numbers, ids (TextField).' },
  { name: 'RadioGroup', id: 'components-radiogroup--unselected', choose: 'One value from a few options that are all worth reading.', avoid: 'A view switch that applies at once (SegmentedControl).' },
  { name: 'Checkbox', id: 'components-checkbox--unchecked', choose: 'A yes/no answer, or several independent options, saved with the form.', avoid: 'A setting that takes effect immediately (Switch).' },
  { name: 'Switch', id: 'components-switch--off', choose: 'A setting that takes effect the moment it is flipped.', avoid: 'A form answer submitted later (Checkbox).' },
  { name: 'Slider', id: 'components-slider--single', choose: 'A position on a scale, or a range, where the exact number matters less: volume, a price filter.', avoid: 'An exact figure (NumberField).' },
  { name: 'FileUpload', id: 'components-fileupload--empty', choose: 'Attaching files, with the limits shown before anyone picks.', avoid: 'Importing rows of data (a dedicated import wizard).' },
] as const;

function Forms() {
  return (
    <DocPage
      title="Forms"
      lead="Forms are among the most settled patterns in software, and breaking the conventions costs completions. Every control in the system shares one field anatomy, and the create-and-edit example shows the whole flow: validation on blur, an error summary on submit, a pending submit."
    >
      <DocSection title="The field anatomy" intro="TextField, Textarea, Select, RadioGroup, Slider and FileUpload render the same parts in the same order; Checkbox and Switch put the label beside the control.">
        <Rules
          items={[
            <>
              <strong>Label</strong>, always visible and required: it is the accessible name. <code>hideLabel</code> only where the context says it
              (a search box in a toolbar).
            </>,
            <>
              <strong>Description</strong> under the control for format hints and consequences (“Shown on invoices”), linked with{' '}
              <code>aria-describedby</code>. Never put required information in a placeholder or a Tooltip.
            </>,
            <>
              <strong>Error</strong> under the description, with an icon and text, never colour alone. It sets <code>aria-invalid</code> and is read
              with the field.
            </>,
            <>
              <strong>id</strong>: every control takes one, so an error summary can link to it.
            </>,
            <>Mark the rare optional field “(optional)” in its label rather than starring every required one.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Which control">
        <Table caption="Form controls">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Control</TableHeaderCell>
              <TableHeaderCell>Choose when</TableHeaderCell>
              <TableHeaderCell>Avoid when</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CONTROLS.map((c) => (
              <TableRow key={c.name}>
                <TableCell rowHeader>
                  <StoryLink id={c.id}>{c.name}</StoryLink>
                </TableCell>
                <TableCell>{c.choose}</TableCell>
                <TableCell>{c.avoid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Layout">
        <Rules
          items={[
            <>
              One column, in a <code>Stack</code>. Short related fields (city and postcode) may share a row in a <code>Switcher</code>.
            </>,
            <>
              Group related fields under a heading, or in a <code>Stack as="fieldset"</code> with a legend. One <code>Card</code> per group on a
              settings page, each with its own Save.
            </>,
            <>
              The primary action goes last. A long form puts it in a sticky action bar: AppShell’s <code>footer</code> slot, or FocusedLayout’s
              for a wizard. Focus scrolls clear of the bar.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="When to validate">
        <Rules
          items={[
            <>On blur, not while someone is still typing into a field for the first time.</>,
            <>Once a field shows an error, check it on every change, so the error clears the moment it is fixed.</>,
            <>
              On submit, check everything. If anything fails, show an error summary above the form, move focus to it, and link each entry to its
              field. Keep the submit button enabled: a disabled button can’t say what’s missing.
            </>,
            <>
              While submitting, put <code>loading</code> on the submit Button: it keeps its label and focus and blocks a second submit.
            </>,
            <>Never clear the form on an error. Keep everything the person typed.</>,
            <>
              Error copy says what is wrong and how to fix it: “Enter an amount of at least £1”, not “Invalid input”. See Guides/Content.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="The error summary" intro="A Banner with the problems as links. It isn’t also announced, because focus moving to it already reads it.">
        <Code label="Error summary">{`
{problems.length > 0 ? (
  <Banner ref={summaryRef} tabIndex={-1} tone="danger" announce={false}
    title={\`There are \${problems.length} problems with this record\`}>
    <Stack as="ul" gap="2xs">
      {problems.map((p) => (
        <li key={p.field}><a href={\`#\${p.id}\`} onClick={focusField(p.id)}>{p.message}</a></li>
      ))}
    </Stack>
  </Banner>
) : null}
// After a failed submit: summaryRef.current?.focus()
`}</Code>
        <Text>
          The working version, with every state, is the <StoryLink id="examples-create-and-edit--invalid">create-and-edit example</StoryLink>.
        </Text>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Forms', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const FormsGuide: StoryObj = { name: 'Forms', render: () => <Forms /> };
