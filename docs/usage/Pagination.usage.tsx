import { Button, Cluster, Pagination } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Pagination],
  whenToUse: [
    'Under a list or table that is paged on the server: it says what is shown (“1–25 of 1,284”) and moves between pages.',
    'Reset to page 1 when the query or filters change. Set `announce` when nothing else on the page announces the new count.',
  ],
  whenNotToUse: [
    { situation: 'A short list that fits on one page', instead: 'no pagination; a count line if it helps' },
    { situation: 'A feed people scroll through', instead: 'a “Show more” button' },
    { situation: 'Steps of a task', instead: '`Stepper`' },
  ],
  do: {
    caption: 'What is shown, then Previous, the pages around the current one, and Next.',
    render: () => <Pagination page={12} pageSize={25} total={1284} onPageChange={() => undefined} />,
  },
  dont: {
    caption: 'Bare arrows: no page, no total, and no name for either button.',
    render: () => (
      <Cluster gap="xs">
        <Button variant="secondary" size="sm">
          ‹
        </Button>
        <Button variant="secondary" size="sm">
          ›
        </Button>
      </Cluster>
    ),
  },
  accessibility: [
    'A `nav` landmark (`label`, default “Pagination”); the current page has `aria-current="page"`, and each page button is named “Page n”.',
    'At either end, Previous or Next is `aria-disabled` rather than disabled, so focus is never dropped from the button someone just used.',
    'The current page is outlined and heavier, not only a different colour.',
  ],
};
