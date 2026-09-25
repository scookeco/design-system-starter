import { Card, CardBody, Skeleton, Stack } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Skeleton],
  whenToUse: [
    'The first load of content whose layout is known: text lines, a card or chart block, table rows under the real header.',
    'Mirror the shape of what is coming so nothing jumps when it arrives.',
  ],
  whenNotToUse: [
    { situation: 'A short action such as saving', instead: '`Button` with `loading`' },
    { situation: 'Loading of unknown shape', instead: '`Spinner`' },
  ],
  do: {
    caption: 'Keep the real card and heading; only the content that is loading is a skeleton.',
    render: () => (
      <Card>
        <CardBody>
          <Skeleton lines={3} />
        </CardBody>
      </Card>
    ),
  },
  dont: {
    caption: 'One big block for a page of mixed content: it says nothing about what is coming.',
    render: () => (
      <Stack>
        <Skeleton shape="block" />
      </Stack>
    ),
  },
  accessibility: [
    'Skeletons are hidden from assistive tech; the region that is loading should say so (for example `aria-busy` on it).',
    'The pulse stops under reduced motion.',
  ],
};
