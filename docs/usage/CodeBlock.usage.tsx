import { CodeBlock, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [CodeBlock],
  whenToUse: [
    'Code, commands, config or payloads that people read or copy: API docs, setup steps, a webhook sample.',
    '`label` names the region and the copy button (“Install command” → “Copy install command”). `language` is a label only; there is no syntax highlighting.',
  ],
  whenNotToUse: [
    { situation: 'A short value inline in a sentence', instead: '`<code>` inside `Text`, with a `CopyButton` if it gets pasted' },
    { situation: 'Logs that stream or grow', instead: 'a dedicated log viewer' },
  ],
  do: {
    caption: 'A labelled block: long lines scroll sideways, and copy takes exactly what is shown.',
    render: () => <CodeBlock label="Install command" language="bash" code="npm install @acme/design-system" />,
  },
  dont: {
    caption: 'Code set in body text: it wraps, loses its spacing, and pasting it breaks.',
    render: () => <Text>npm install @acme/design-system</Text>,
  },
  accessibility: [
    'The code sits in a focusable `region` named by `label`, so keyboard users can scroll a long line (axe `scrollable-region-focusable`).',
    'The copy button is a `CopyButton`: it announces “Copied” politely.',
  ],
};
