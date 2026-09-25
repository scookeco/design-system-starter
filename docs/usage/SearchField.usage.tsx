import { SearchField, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SearchField],
  whenToUse: [
    'Filtering a list or table by text as people type, in the list’s `role="search"` toolbar.',
    'It is controlled: pass `value` and `onValueChange`, and derive the rows from the query. The clear button (and Escape) empty it and keep focus in the field.',
  ],
  whenNotToUse: [
    { situation: 'Picking one value from a known list', instead: '`Select`' },
    { situation: 'Entering data in a form', instead: '`TextField`' },
  ],
  do: {
    caption: 'A labelled search with a clear button once there is a query.',
    render: () => <SearchField label="Search records" value="lease" onValueChange={() => undefined} />,
  },
  dont: {
    caption: 'A plain text field for search: not announced as a search, no search icon, and no quick way to clear.',
    render: () => <TextField label="Search records (don’t example)" defaultValue="lease" />,
  },
  accessibility: [
    '`label` is required; `hideLabel` hides it visually only. The input is `type="search"`.',
    'The clear button is named by `clearLabel` (“Clear search”) and is at least the minimum target size; clearing returns focus to the input.',
    'Announce the result count elsewhere, once (a list’s `Pagination` with `announce`, or a polite status line), not on every keystroke from the field.',
  ],
};
