import { Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Text],
  whenToUse: [
    'Running text, descriptions and metadata, in one of three sizes and two tones.',
    '`numeric` for numbers that line up in columns; `as="dt"`/`as="dd"` for label–value pairs in a `Stack as="dl"`.',
  ],
  whenNotToUse: [
    { situation: 'A title', instead: '`Heading`' },
    { situation: 'Status such as “Overdue”', instead: '`Badge`, which pairs the word with a tone and icon' },
    { situation: 'An error under a field', instead: 'the field’s `error` prop' },
  ],
  do: {
    caption: 'Muted tone for secondary information, default tone for the content itself.',
    render: () => (
      <Stack gap="2xs">
        <Text>Hardware lease renews on 1 March.</Text>
        <Text size="caption" tone="muted">
          Updated 2 hours ago
        </Text>
      </Stack>
    ),
  },
  dont: {
    caption: 'Everything muted: the content the reader came for is as quiet as the metadata.',
    render: () => (
      <Stack gap="2xs">
        <Text tone="muted">Hardware lease renews on 1 March.</Text>
        <Text size="caption" tone="muted">
          Updated 2 hours ago
        </Text>
      </Stack>
    ),
  },
  accessibility: [
    'Both tones meet 4.5:1 on every surface, in light and dark.',
    'Renders a `<p>` by default; pick `as="span"` inside inline contexts so the markup stays valid.',
  ],
};
