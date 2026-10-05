import { Progress, Spinner } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Progress],
  whenToUse: [
    'Determinate progress through work someone waits on: files of an upload, rows of an import, the stages of a background job.',
    'Say the value in words with `valueText` (“3 of 12 files”, “Step 2 of 3: Review”); it is shown and read out. Without it, a whole percentage.',
  ],
  whenNotToUse: [
    { situation: 'Work of unknown length', instead: '`Spinner`' },
    { situation: 'Usage against a limit (seats, storage, API calls)', instead: '`Meter`' },
    { situation: 'Where someone is in a wizard', instead: '`Stepper`, which already says how far: don’t add a bar above it' },
  ],
  do: {
    caption: 'A label and the value in words, over the bar.',
    render: () => <Progress label="Importing records" value={340} max={1284} valueText="340 of 1,284 records" />,
  },
  dont: {
    caption: 'A spinner for a job whose size is known: people can’t tell whether to wait or come back later.',
    render: () => <Spinner label="Importing 1,284 records" />,
  },
  accessibility: [
    'A `progressbar` named by the visible `label`, with `aria-valuenow`, `aria-valuemax` and `aria-valuetext` from `valueText`.',
    'The bar isn’t announced as it moves. For a long job, announce milestones (a Toast when it finishes).',
  ],
};
