import { Card, CardBody, CardHeader, Grid, Reel, Text } from '../../src/index';
import type { UsageDoc } from './types';

const files = ['Site plan.pdf', 'Floor two.png', 'Survey.pdf', 'Lease.pdf', 'Invoice 2041.pdf'];

export const usage: UsageDoc = {
  covers: [Reel],
  whenToUse: [
    'A row of like items that is fine to scroll sideways: recent files, suggested templates, image thumbnails.',
    '`itemWidth` takes a grid-item token (or `auto`); items snap to their start as the row scrolls.',
    '`label` names the row: it is a region in the tab order, so arrow keys scroll it even when the items aren’t focusable.',
  ],
  whenNotToUse: [
    { situation: 'Items people compare or must all see', instead: '`Grid`, which wraps' },
    { situation: 'Tabular data wider than the screen', instead: '`Table` (its own scroll region, with a sticky header)' },
    { situation: 'Primary navigation', instead: '`Nav` or `NavTabs`' },
  ],
  do: {
    caption: 'A named row of recent files; the cut-off card at the edge shows there is more.',
    render: () => (
      <Reel label="Recent files" itemWidth="sm">
        {files.map((name) => (
          <Card key={name}>
            <CardHeader title={name} level={3} />
          </Card>
        ))}
      </Reel>
    ),
  },
  dont: {
    caption: 'Every file in a grid when only the latest few matter: the page grows with the folder.',
    render: () => (
      <Grid min="sm" gap="sm">
        {files.map((name) => (
          <Card key={name}>
            <CardBody>
              <Text>{name}</Text>
            </CardBody>
          </Card>
        ))}
      </Grid>
    ),
  },
  accessibility: [
    'A `region` named by `label` with `tabIndex=0`: keyboard users can focus it and scroll with the arrow keys (axe `scrollable-region-focusable`).',
    'Items are read in DOM order; snapping is `proximity`, never `mandatory`, so it never traps a scroll position.',
  ],
};
