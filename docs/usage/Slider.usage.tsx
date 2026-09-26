import { Slider } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Slider],
  whenToUse: [
    'A value on a continuous scale where position matters more than the exact number: volume, a price filter, a threshold.',
    'A range: pass two values in `defaultValue` (or `value`), and name the thumbs with `thumbLabels`.',
    'Say the value in words with `formatValue` (“£40”, “40%”); it is shown beside the track and read out for each thumb.',
    'Refetch or save on `onValueCommit` (once, when the user lets go), not on every `onValueChange`.',
  ],
  whenNotToUse: [
    { situation: 'An exact number (a quantity, an amount)', instead: '`TextField type="number"`' },
    { situation: 'A few named levels', instead: '`SegmentedControl` or `RadioGroup`' },
  ],
  do: {
    caption: 'A labelled range with its value in words; every thumb works with arrow keys.',
    render: () => <Slider label="Price" defaultValue={[20, 80]} max={200} step={5} formatValue={(v) => `£${String(v)}`} />,
  },
  dont: {
    caption: 'A slider for an exact figure: hitting 1,250 by dragging is tedious. Use a field.',
    render: () => <Slider label="Invoice amount" defaultValue={[1250]} max={10000} />,
  },
  accessibility: [
    'Each thumb is a `slider` with `aria-valuetext` from `formatValue`; in a range each is named “label, minimum” and “label, maximum”.',
    'Keyboard: arrows move one step, Page Up/Down ten, Home/End to the ends. A click on the track moves the nearest thumb, so no drag is needed (WCAG 2.2 SC 2.5.7).',
    'Thumbs are `size.target-min` (24px). `description` and `error` use the shared field anatomy; `id` lands on the first thumb.',
  ],
};
