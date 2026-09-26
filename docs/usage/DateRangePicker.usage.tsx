import { DatePicker, DateRangePicker, Stack } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DateRangePicker],
  whenToUse: ['A range of days: a report period, an audit log’s date filter, a leave request.'],
  whenNotToUse: [
    { situation: 'One date', instead: '`DatePicker`' },
    { situation: 'A preset period (last 7, 30, 90 days)', instead: '`SegmentedControl` or `Select`, with a custom range as an option' },
  ],
  do: {
    caption: 'One field, one calendar: the two ends can’t be chosen out of order.',
    render: () => <DateRangePicker label="Date range" defaultValue={{ start: '2026-09-01', end: '2026-09-25' }} />,
  },
  dont: {
    caption: 'Two separate pickers: nothing stops an end before the start, and the range isn’t visible as one.',
    render: () => (
      <Stack gap="sm">
        <DatePicker label="From" defaultValue="2026-09-25" />
        <DatePicker label="To" defaultValue="2026-09-01" />
      </Stack>
    ),
  },
  accessibility: [
    'Start and end are separate groups of segments with their own names; the calendar marks both ends and the days between.',
    'Values are calendar dates. To filter instants, convert the range to the start of the first day and the end of the last in the reader’s time zone (as the audit log does), never UTC midnight.',
  ],
};
