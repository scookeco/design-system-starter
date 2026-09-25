import { Link, LinkProvider, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Link, LinkProvider],
  whenToUse: [
    'Navigation written as text: an inline link in a sentence, “View all records”, a way home from an error page.',
    'Wrap the app once in `LinkProvider` (see Getting started) with its router’s link, adapted to take `href`. `Link`, `Nav`, `NavTabs` and `Breadcrumbs` then route client-side; without it they render a plain `<a>`.',
    'The adapter spreads every prop onto its anchor and forwards `ref`: tooltips and focus management attach to it.',
  ],
  whenNotToUse: [
    { situation: 'An action that changes data or opens something in place', instead: '`Button`' },
    { situation: 'The app’s areas or a record’s sections', instead: '`Nav` or `NavTabs`, which mark the current page' },
    { situation: 'A trail back up the hierarchy', instead: '`Breadcrumbs`' },
  ],
  do: {
    caption: 'Link text that says where it goes, inside the sentence it belongs to.',
    render: () => (
      <Text>
        The lease renews in January. <Link href="/records/r-1002/files">Read the signed agreement</Link> for the full terms.
      </Text>
    ),
  },
  dont: {
    caption: '“Click here”: out of context (a screen reader’s list of links) it says nothing about where it goes.',
    render: () => (
      <Text>
        The lease renews in January. For the full terms, <Link href="/records/r-1002/files">click here</Link>.
      </Text>
    ),
  },
  accessibility: [
    'A real anchor with an `href`, so it works with the keyboard, opens in a new tab and is listed as a link.',
    'Underlined as well as coloured, so it never depends on colour alone.',
    'Write link text that makes sense on its own; the page’s other links should not share it with a different destination.',
  ],
};
