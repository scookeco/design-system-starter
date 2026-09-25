import { Text, VisuallyHidden } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [VisuallyHidden],
  whenToUse: [
    'Words a screen reader needs that sighted people get from layout: a heading for a region whose purpose is visually obvious, “up” behind a ▲.',
    'Use `as="div"` around block content such as a heading; the default `span` sits inside text.',
  ],
  whenNotToUse: [
    { situation: 'Naming a control', instead: 'its own `label` or `aria-label` (every system control takes one)' },
    { situation: 'Hiding content from everyone', instead: 'don’t render it, or use the `hidden` attribute' },
    { situation: 'Anything sighted users also need', instead: 'visible text' },
  ],
  do: {
    caption: 'The arrow is hidden from screen readers and the word is hidden from the screen, so both read “up 12%”.',
    render: () => (
      <Text>
        <span aria-hidden="true">▲</span> <VisuallyHidden>up</VisuallyHidden> 12%
      </Text>
    ),
  },
  dont: {
    caption: 'Instructions only screen readers get: sighted keyboard users miss them too.',
    render: () => (
      <Text>
        Reference <VisuallyHidden>use the format AB-1234</VisuallyHidden>
      </Text>
    ),
  },
  accessibility: [
    'Clipped to 1px rather than `display: none`, so it stays in the accessibility tree and is announced.',
    'Not focusable. For a skip link, use AppShell’s, which shows on focus.',
  ],
};
