import { Citation, SourcesList, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Citation, SourcesList],
  whenToUse: [
    'An AI answer that makes claims: number each claim’s source inline ([1]) and list the sources under the answer, each with where it came from and a link to it.',
    'Give the `SourcesList` a `useId()` id and pass it to every `Citation` as `sources`; `onActivate` highlights the source (and, in a record, the cited field).',
  ],
  whenNotToUse: [
    { situation: 'Footnotes in content people wrote', instead: 'a plain list of links' },
    { situation: 'A link to one page', instead: '`Link`' },
  ],
  do: {
    caption: 'Each claim cites a source that says where it came from and links to it.',
    render: () => (
      <Stack gap="sm">
        <Text>
          It renews on 15 January 2027
          <Citation number={1} sources="usage-sources" title="Renews on" />.
        </Text>
        <SourcesList id="usage-sources" sources={[{ title: 'Renews on', origin: 'Record field', excerpt: '15 Jan 2027', href: '#properties', hrefLabel: 'Show in record' }]} />
      </Stack>
    ),
  },
  dont: {
    caption: 'An inert “[1]”: a citation that can’t be followed is decoration, not provenance.',
    render: () => <Text>It renews on 15 January 2027 [1].</Text>,
  },
  accessibility: [
    'A citation is a real link named “Source 1: Renews on”, not the bare number; following it moves focus to the source, which is marked `aria-current`.',
    'Citations sit inside running text, so the inline exception to the 24px target size applies; don’t use them as standalone controls.',
  ],
};
