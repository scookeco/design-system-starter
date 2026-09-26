import { Button, Cluster, Toolbar, ToolbarButton, ToolbarSeparator } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Toolbar, ToolbarButton, ToolbarSeparator],
  whenToUse: ['A group of actions on one thing that people use repeatedly: a selection’s bulk actions, an editor’s formatting, a reading pane’s triage.', 'Where one tab stop for the group saves keyboard users a dozen Tabs.'],
  whenNotToUse: [
    { situation: 'A page’s one or two primary actions', instead: '`Button`s in the `PageHeader`' },
    { situation: 'Navigation between pages or sections', instead: '`NavTabs` or `Nav`' },
  ],
  do: {
    caption: 'Related actions in one tab stop, grouped by separators, with shortcuts in their tooltips.',
    render: () => (
      <Toolbar label="Conversation actions">
        <ToolbarButton icon="archive" shortcut="e">
          Archive
        </ToolbarButton>
        <ToolbarButton shortcut="u">Mark as unread</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton icon="download" hideLabel>
          Export
        </ToolbarButton>
      </Toolbar>
    ),
  },
  dont: {
    caption: 'A page’s main actions forced into a toolbar: they belong in the header, as ordinary buttons.',
    render: () => (
      <Cluster>
        <Button>New record</Button>
      </Cluster>
    ),
  },
  accessibility: [
    'Radix Toolbar: Tab enters and leaves; ← → (↑ ↓ vertical) move between controls with a roving tabindex, wrapping; Home and End jump.',
    'Icon-only buttons (`hideLabel`) keep their label as the accessible name and show it in a tooltip on hover and focus.',
    '`pressed` makes a toggle (aria-pressed); `shortcut` shows in the tooltip and sets aria-keyshortcuts.',
  ],
};
