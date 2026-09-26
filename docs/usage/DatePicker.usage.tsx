import { DatePicker, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DatePicker],
  whenToUse: ['A calendar date: a renewal, a due date, a birthday. Typed in the reader’s own order, or picked.', 'Values that are ISO calendar dates (“2026-09-25”), which is how the app passes them.'],
  whenNotToUse: [
    { situation: 'A start and an end', instead: '`DateRangePicker`' },
    { situation: 'A moment in time (with an hour)', instead: 'a date and a time, stored as an instant; show it with `useFormat().dateTime`' },
    { situation: 'Showing a date', instead: '`useFormat().date(iso)`' },
  ],
  do: {
    caption: 'Segments in the reader’s locale order (LocaleProvider), with the earliest allowed date set.',
    render: () => <DatePicker label="Renews on" defaultValue="2026-10-14" min="2026-09-25" />,
  },
  dont: {
    caption: 'A free-text date: ambiguous (is 03/04 March or April?) and parsed by hand.',
    render: () => <TextField label="Renews on" placeholder="MM/DD/YYYY" />,
  },
  accessibility: [
    'Each segment (day, month, year) is a spin button: type digits or use ↑ ↓; the calendar button opens a grid navigable with the arrow keys, Page Up/Down for months.',
    'The locale comes from LocaleProvider, the same one `useFormat()` uses, so typed and displayed dates agree; the calendar opens on today in the provider’s time zone.',
    'Inside a Dialog the calendar portals into it and Esc closes only the calendar.',
  ],
};
