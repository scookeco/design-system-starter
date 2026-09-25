import { Breadcrumbs } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Breadcrumbs],
  whenToUse: ['Pages below the top level (a record, a settings category) in AppShell’s `breadcrumbs` slot.'],
  whenNotToUse: [
    { situation: 'Top-level pages reached from the main nav', instead: 'no breadcrumbs; the nav already shows where you are' },
    { situation: 'Steps in a flow', instead: 'a heading that names the step' },
  ],
  do: {
    caption: 'Every ancestor is a link; the current page matches the page title.',
    render: () => <Breadcrumbs items={[{ label: 'Records', href: '/records' }]} current="Hardware lease" />,
  },
  dont: {
    caption: 'History instead of hierarchy: the trail repeats where you clicked, not where the page lives.',
    render: () => (
      <Breadcrumbs
        label="Visited pages"
        items={[
          { label: 'Home', href: '/home' },
          { label: 'Search', href: '/search' },
          { label: 'Records', href: '/records' },
          { label: 'Search', href: '/search?q=lease' },
        ]}
        current="Hardware lease"
      />
    ),
  },
  accessibility: [
    'A labelled nav landmark with an ordered list; the current page is text with `aria-current="page"`.',
    'Separators are decorative and hidden from assistive tech.',
  ],
};
