import { Stat, Switcher, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Stat],
  whenToUse: [
    'A headline number on a dashboard or overview: a count, a total, a rate, with an optional change and what it compares against.',
    'Set `delta.direction` from the numbers (up, down, flat) and `delta.tone` from what it means (positive, negative, neutral): fewer overdue records is down and positive.',
    'Put several in a `Switcher`, so they sit in one row or one column, never a ragged wrap.',
  ],
  whenNotToUse: [
    { situation: 'Usage against a limit', instead: '`Meter`' },
    { situation: 'A value among a record’s properties', instead: 'a definition list in the record’s aside' },
    { situation: 'Many numbers to compare', instead: '`Table`' },
  ],
  do: {
    caption: 'Direction from the numbers, tone from the meaning, and what the change compares against.',
    render: () => (
      <Switcher threshold="xs">
        <Stat label="Overdue records" value="14" delta={{ value: '3', direction: 'up', tone: 'negative' }} comparison="vs previous 30 days" />
        <Stat label="Pending approvals" value="9" delta={{ value: '25%', direction: 'down', tone: 'positive' }} comparison="vs previous 30 days" />
      </Switcher>
    ),
  },
  dont: {
    caption: 'A bare number in coloured text: no label, no comparison, and the colour is the only hint of whether it is good.',
    render: () => <Text size="body-lg">14 (+3)</Text>,
  },
  accessibility: [
    'The direction is an icon plus a visually hidden word (“Up”, “Down”, “No change”; set with `directionLabels`); tone colour only adds good or bad, never carries it alone.',
    'Values use tabular figures, so columns of stats line up.',
    'Format numbers for the locale before passing them; the tile doesn’t format.',
  ],
};
