import { Banner, Card, CardBody, CardHeader, Imposter, Meter, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

const usageRows = (
  <Stack gap="sm">
    <Meter label="Seats" value={42} max={50} />
    <Meter label="Storage" value={12} max={100} valueText="12 of 100 GB" />
  </Stack>
);

export const usage: UsageDoc = {
  covers: [Imposter],
  whenToUse: [
    'An overlay that belongs to one region, not the page: a notice over a chart with no data, an upgrade prompt over a locked panel, “Loading…” over stale content.',
    'The Imposter is the container, so no positioning CSS is needed. `margin` keeps the overlay off the edges; `contain` (the default) keeps it inside and scrolls it if it is taller.',
    'Set `inertContent` whenever the overlay hides what is underneath, so focus and screen readers skip it.',
  ],
  whenNotToUse: [
    { situation: 'Something that must take focus and block the page', instead: '`Dialog`' },
    { situation: 'A message that doesn’t cover anything', instead: '`Banner` above the region, or `EmptyState` in place of it' },
  ],
  do: {
    caption: 'The locked panel is inert under the prompt, so nobody tabs into controls they can’t see.',
    render: () => (
      <Imposter inertContent overlay={<Banner tone="info" announce={false}>Usage history is on the Business plan.</Banner>}>
        {usageRows}
      </Imposter>
    ),
  },
  dont: {
    caption: 'An overlay without `inertContent`: the meters underneath are still read out and focusable.',
    render: () => (
      <Card>
        <CardHeader title="Usage" level={3} />
        <CardBody>
          <Imposter overlay={<Text>Upgrade to see usage.</Text>}>{usageRows}</Imposter>
        </CardBody>
      </Card>
    ),
  },
  accessibility: [
    'The overlay follows the content in DOM order and reading order.',
    '`inertContent` sets `inert` on the content underneath while an overlay is shown.',
    'A contained overlay that can be taller than its container needs `overlayLabel`: it becomes a named, focusable region so the keyboard can scroll it.',
  ],
};
