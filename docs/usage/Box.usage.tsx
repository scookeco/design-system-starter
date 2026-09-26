import { Box, Card, CardBody, CardHeader, Cluster, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Box],
  whenToUse: [
    'Padding inside a region that has no component of its own: a toolbar strip, a panel’s body, the inside of a custom slot.',
    '`padding` is an inset token; `paddingBlock` and `paddingInline` override one axis.',
  ],
  whenNotToUse: [
    { situation: 'A surface with a border, a heading or actions', instead: '`Card` (its body already has padding)' },
    { situation: 'Space between siblings', instead: 'the `gap` of a `Stack`, `Cluster` or `Grid`: the parent owns the space between' },
    { situation: 'Page gutters', instead: '`Center` with `gutters`' },
  ],
  do: {
    caption: 'A toolbar strip padded from the inset scale.',
    render: () => (
      <Box paddingBlock="xs" paddingInline="md">
        <Cluster gap="sm">
          <Text size="caption">3 selected</Text>
        </Cluster>
      </Box>
    ),
  },
  dont: {
    caption: 'A Box wrapped around a Card’s body: the padding doubles up.',
    render: () => (
      <Card>
        <CardHeader title="Billing" />
        <CardBody>
          <Box padding="lg">
            <Text>Next invoice on 1 April.</Text>
          </Box>
        </CardBody>
      </Card>
    ),
  },
  accessibility: ['Layout only: no role. Choose `as` for the semantics (`section`, `aside`) and name it when it is a landmark.'],
};
