import { Cluster, Stat, Switcher } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Switcher],
  whenToUse: [
    'Equal items that should sit in one row when there is room and one column when there isn’t, with nothing in between: stat tiles, plan cards, a two- or three-part form row.',
    '`threshold` is a content-width token: below it (of the container’s width, not the viewport’s), every child stacks.',
  ],
  whenNotToUse: [
    { situation: 'Many items that should reflow into as many columns as fit', instead: '`Grid`' },
    { situation: 'Buttons or tags that wrap naturally', instead: '`Cluster`' },
    { situation: 'Two regions of different weight', instead: '`PageLayout` or `Sidebar`' },
  ],
  do: {
    caption: 'Stats in one row, which becomes one column all at once when narrow.',
    render: () => (
      <Switcher threshold="xs">
        <Stat label="Records created" value="86" />
        <Stat label="Pending approvals" value="9" />
        <Stat label="Overdue records" value="14" />
      </Switcher>
    ),
  },
  dont: {
    caption: 'Stats in a wrapping Cluster: at in-between widths two sit on one row and the third alone below, at a different width.',
    render: () => (
      <Cluster gap="md">
        <Stat label="Records created" value="86" />
        <Stat label="Pending approvals" value="9" />
        <Stat label="Overdue records" value="14" />
      </Cluster>
    ),
  },
  accessibility: [
    'Layout only: it adds no landmark, and children stay in DOM order in both arrangements, so reading and focus order never change.',
    'Responds to its container, so it also stacks at high zoom.',
  ],
};
