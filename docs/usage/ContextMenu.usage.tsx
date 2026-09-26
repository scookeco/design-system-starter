import { Button, ContextMenu, Menu } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ContextMenu],
  whenToUse: ['A shortcut to the actions on a row, card or list item that are also available elsewhere (a ⋯ menu, a toolbar).'],
  whenNotToUse: [
    { situation: 'The only way to reach an action', instead: 'a visible `Menu` on the thing: nobody discovers a context menu' },
    { situation: 'Overriding the browser’s menu on text, links or images', instead: 'leave the browser’s menu alone there' },
  ],
  do: {
    caption: 'The same items as the visible ⋯ menu, on a focusable region.',
    render: () => (
      <ContextMenu items={[{ label: 'Archive', shortcut: 'e' }, { label: 'Delete', tone: 'danger' }]}>
        <div tabIndex={0} role="group" aria-label="Northwind renewal">
          Northwind renewal <Menu trigger={<Button variant="ghost" icon="more" aria-label="More actions">More</Button>} items={[{ label: 'Archive' }, { label: 'Delete', tone: 'danger' }]} />
        </div>
      </ContextMenu>
    ),
  },
  dont: {
    caption: 'Actions that exist only on right-click: invisible to most people, and to keyboard users who don’t know Shift+F10.',
    render: () => (
      <ContextMenu items={[{ label: 'Delete', tone: 'danger' }]}>
        <div tabIndex={0} role="group" aria-label="Report">
          Report (no other way to delete it)
        </div>
      </ContextMenu>
    ),
  },
  accessibility: [
    'Radix ContextMenu: opens on right-click, a long press, or Shift+F10 / the Menu key on the focused region; arrows, typeahead, Esc and focus return as in `Menu`.',
    'The region must be focusable and named, so keyboard users can reach it.',
    'Items look and read exactly like Menu’s, shortcuts included (`aria-keyshortcuts`).',
  ],
};
