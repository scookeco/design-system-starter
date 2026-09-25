import { Card, CardHeader, Grid } from '../../src/index';
import type { UsageDoc } from './types';

const STATS = ['Open records', 'Due this week', 'Renewals'];

export const usage: UsageDoc = {
  covers: [Grid],
  whenToUse: ['Equal items that reflow by available width with no breakpoints: cards, stat tiles, galleries.'],
  whenNotToUse: [
    { situation: 'Rows of comparable attributes', instead: '`Table`' },
    { situation: 'A main region and a narrow side region', instead: '`Sidebar`' },
  ],
  do: {
    caption: 'Tiles of equal importance, each at least the `min` width.',
    render: () => (
      <Grid min="sm" gap="sm">
        {STATS.map((s) => (
          <Card key={s}>
            <CardHeader title={s} level={4} />
          </Card>
        ))}
      </Grid>
    ),
  },
  dont: {
    caption: 'A grid of one: an item that isn’t part of a set is just content.',
    render: () => (
      <Grid min="lg">
        <Card>
          <CardHeader title="Notes" level={4} />
        </Card>
      </Grid>
    ),
  },
  accessibility: ['Layout only. Items read in DOM order, row by row.', 'For a set of like items, `as="ul"` exposes the count.'],
};
