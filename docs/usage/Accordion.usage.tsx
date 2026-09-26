import { Accordion, Badge } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Accordion],
  whenToUse: [
    'A stack of titled sections where people open one or a few: the steps an agent took, grouped settings help, an FAQ.',
    '`single` (default) keeps one open; `multiple` lets several stay open. Set `headingLevel` to fit the page outline.',
  ],
  whenNotToUse: [
    { situation: 'One section of details', instead: '`Disclosure`' },
    { situation: 'Sections that are pages of their own', instead: '`NavTabs`' },
    { situation: 'A form split into steps', instead: 'the Wizard archetype (`SetupWizard`)' },
  ],
  do: {
    caption: 'Each title names a step and its status sits beside it.',
    render: () => (
      <Accordion
        defaultValue="check"
        items={[
          { value: 'search', title: 'Search records', meta: <Badge tone="success">Done</Badge>, content: '12 records matched.' },
          { value: 'check', title: 'Check permissions', meta: <Badge tone="success">Done</Badge>, content: 'You can move 10 of them.' },
        ]}
      />
    ),
  },
  dont: {
    caption: 'Every section holds one line: show the lines instead.',
    render: () => (
      <Accordion
        items={[
          { value: 'a', title: 'Owner', content: 'Sam Rivera' },
          { value: 'b', title: 'Status', content: 'Active' },
        ]}
      />
    ),
  },
  accessibility: [
    'Each title is a heading at `headingLevel` wrapping a button with `aria-expanded` (Radix Accordion). Arrow keys move between titles; Home and End jump.',
    'A disabled item stays in the list and says why in its title or content.',
  ],
};
