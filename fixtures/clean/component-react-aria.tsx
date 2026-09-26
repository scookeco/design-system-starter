// @expect clean
// @as src/components/Combobox/Fixture.tsx
// Negative control: a system component may wrap React Aria and its date library.
import { parseDate } from '@internationalized/date';
import { DatePicker } from 'react-aria-components';

export const Fixture = () => <DatePicker aria-label="Due" defaultValue={parseDate('2026-09-25')} />;
