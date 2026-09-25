import { Button, Cluster, Spinner } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Spinner],
  whenToUse: [
    'Short waits of unknown length where the shape of the result isn’t known.',
    'Inside a pending button, through `Button loading` rather than directly.',
  ],
  whenNotToUse: [
    { situation: 'Loading a page, list or card whose layout is known', instead: '`Skeleton`' },
    { situation: 'A pending form submit', instead: '`Button` with `loading`' },
  ],
  do: {
    caption: 'The pending state belongs to the button that started it.',
    render: () => <Button loading>Save changes</Button>,
  },
  dont: {
    caption: 'A spinner standing in for a whole list: the page jumps when the rows arrive.',
    render: () => (
      <Cluster justify="center">
        <Spinner size="md" label="Loading records" />
      </Cluster>
    ),
  },
  accessibility: [
    'A standalone spinner takes a `label` and is announced as a status; inside a button it is decorative and the label stays.',
    'It keeps turning under reduced motion: it is the only sign of progress.',
  ],
};
