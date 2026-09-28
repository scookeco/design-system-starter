import { ArchiveIcon, Button, Cluster, iconsByName, Toolbar, ToolbarButton } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  // Every icon value (the lookup holds each one once).
  covers: Object.values(iconsByName),
  whenToUse: [
    'Beside a label, to help people find an action or a place quickly: `<Button icon={PlusIcon}>New record</Button>`, a `Nav` item, a `Menu` item, a `ToolbarButton`. Import the icon from the system entry and pass it as the value.',
    'One meaning per icon, everywhere: `ArchiveIcon` archives, `InboxIcon` is the inbox, `SparkleIcon` marks AI and only AI. Look the set up on Foundations/Icons.',
    'Data that names its icon (a config keyed by route, say) stores the value (`{ "/inbox": InboxIcon }`), not a string.',
  ],
  whenNotToUse: [
    { situation: 'No icon in the set means what you need', instead: 'a text label alone; propose the icon as a design-system change (Guides/Contributing)' },
    { situation: 'Looking an icon up by a name from data (`iconsByName[name]`)', instead: 'store the icon value itself. `iconsByName` and `IconName` are deprecated: the lookup bundles every icon' },
    { situation: 'An icon that looks close enough (a download arrow for an inbox)', instead: 'the icon that means it, or no icon' },
    { situation: 'Status told by an icon alone', instead: '`Badge` or `Banner`, which pair the status icon with text' },
  ],
  do: {
    caption: 'The value, next to a label that says the same thing: the page bundles this icon and no other.',
    render: () => (
      <Toolbar label="Conversation actions">
        <ToolbarButton icon={ArchiveIcon} shortcut="e">
          Archive
        </ToolbarButton>
      </Toolbar>
    ),
  },
  dont: {
    caption: 'A lookup by name: it works, but pulls the whole icon set into the bundle, and the name isn’t checked where the data is written. Import `ArchiveIcon` instead.',
    render: () => (
      <Cluster gap="sm">
        <Button variant="secondary" icon={iconsByName.archive}>
          Archive
        </Button>
      </Cluster>
    ),
  },
  accessibility: [
    'Icons are decorative: the system renders them `aria-hidden` and not focusable, so a control’s accessible name comes from its label.',
    'An icon-only button needs an `aria-label` and a `Tooltip` with the same words (`Button` with `hideLabel`, `ToolbarButton` without children).',
    'Never rely on the icon alone to tell status or meaning; the visible text says it.',
  ],
};
