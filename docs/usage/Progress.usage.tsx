import { Progress, Spinner } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Progress],
  whenToUse: [
    'Determinate progress through a task: steps of a wizard, files of an upload, rows of an import.',
    'Say the value in words with `valueText` (“Step 2 of 4”, “3 of 12 files”); it is shown and read out. Without it, a whole percentage.',
  ],
  whenNotToUse: [
    { situation: 'Work of unknown length', instead: '`Spinner`' },
    { situation: 'Usage against a limit (seats, storage, API calls)', instead: '`Meter`' },
    { situation: 'The steps themselves', instead: '`Stepper`, beside it' },
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
