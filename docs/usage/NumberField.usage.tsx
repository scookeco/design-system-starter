import { NumberField, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [NumberField],
  whenToUse: ['Quantities, amounts and percentages people type: seats, a price, a discount.', 'Money: pass `currency`, and the value is integer minor units, like every amount in the system.'],
  whenNotToUse: [
    { situation: 'Numbers that aren’t quantities (a phone number, a postcode, an id)', instead: '`TextField` with the right `inputMode`' },
    { situation: 'A value from a small range, dragged', instead: '`Slider`' },
  ],
  do: {
    caption: 'An amount in the reader’s format, stored as minor units.',
    render: () => <NumberField label="Amount" currency="USD" defaultValue={125050} min={0} />,
  },
  dont: {
    caption: 'A text field for an amount: “1.250,50” and “1,250.50” can’t both be parsed, and nothing stops “12e3”.',
    render: () => <TextField label="Amount" type="number" />,
  },
  accessibility: [
    'Why React Aria and not `<input type="number">`: the native input accepts “e”, ignores the locale’s grouping and decimal marks, changes on scroll, and its spinners are tiny targets.',
    'Typing and display follow LocaleProvider (the same locale as `useFormat()`); ↑ ↓ step, Page Up/Down step by ten, Home/End jump to min/max.',
    'The − and + buttons are 24px targets with names (`decrementLabel`, `incrementLabel`); they’re removed from the tab order, since the arrow keys do the same.',
  ],
};
