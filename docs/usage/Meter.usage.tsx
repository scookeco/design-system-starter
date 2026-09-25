import { Meter, Progress } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Meter],
  whenToUse: [
    'How much of a limit is used: seats, storage, API calls, a budget.',
    'Say the usage in words with `valueText` (“42 of 50 seats”). Past `warningAt` (default 80%) it shows “Nearing limit”; from `dangerAt` (default the limit) “Limit reached”, each with an icon.',
  ],
  whenNotToUse: [
    { situation: 'Progress through a task', instead: '`Progress`' },
    { situation: 'A headline number with a trend', instead: '`Stat`' },
  ],
  do: {
    caption: 'Near the limit: the fill changes colour, and an icon and words say so.',
    render: () => <Meter label="Seats" value={42} max={50} valueText="42 of 50 seats" />,
  },
  dont: {
    caption: 'A progress bar for usage: it reads as a task heading for done, and never warns as the limit nears.',
    render: () => <Progress label="Seats" value={42} max={50} valueText="42 of 50 seats" />,
  },
  accessibility: [
    'A `meter` named by the visible label, with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` (the usage, plus the status past a threshold).',
    'Warning and danger are icon and words as well as colour.',
  ],
};
