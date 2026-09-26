import { InlineEdit, TextField } from '../../src/index';
import type { UsageDoc } from './types';

const noop = () => undefined;

export const usage: UsageDoc = {
  covers: [InlineEdit],
  whenToUse: ['Changing one value where it’s shown: a record’s name in its header, a label in a table cell.', 'Frequent small edits by people who own the thing.'],
  whenNotToUse: [
    { situation: 'Several fields that belong together', instead: 'a form (`CreateEditFlow`), or a Dialog' },
    { situation: 'A value that needs a long explanation or a review step', instead: 'a form with its description and a Save button' },
  ],
  do: {
    caption: 'The value is the edit button; Enter saves, Escape cancels, focus comes back to the value.',
    render: () => <InlineEdit label="Name" value="Northwind renewal" onSave={noop} />,
  },
  dont: {
    caption: 'An always-open field for a value people rarely change: it looks like a form waiting to be filled.',
    render: () => <TextField label="Name" defaultValue="Northwind renewal" />,
  },
  accessibility: [
    'View mode is a button named “Edit <label>: <value>”; edit mode is a labelled input with Save and Cancel buttons, so it works without the keys too.',
    'Errors (from `validate` or returned by `onSave`) sit under the field, linked with aria-describedby; the draft is kept.',
    'While `onSave`’s promise is pending, Save shows its pending state and Cancel is disabled.',
    '`disabledReason` keeps the value visible and focusable, with the reason as its description.',
  ],
};
