import { Button, Cluster, Menu } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Menu],
  whenToUse: [
    'Secondary actions behind a “More” button in a crowded header or table row.',
    'The account menu in AppShell’s `userMenu` slot.',
  ],
  whenNotToUse: [
    { situation: 'Choosing a value for a form field', instead: '`Select`' },
    { situation: 'The one primary action', instead: 'a visible `Button`' },
    { situation: 'Navigation between pages', instead: '`Nav`' },
  ],
  do: {
    caption: 'The primary action stays visible; the rest live behind “More”, with the destructive one last.',
    render: () => (
      <Cluster gap="xs">
        <Button>Edit</Button>
        <Menu
          trigger={<Button variant="secondary">More</Button>}
          items={[{ label: 'Duplicate record' }, { label: 'Export PDF', icon: 'download' }, 'separator', { label: 'Delete record' }]}
        />
      </Cluster>
    ),
  },
  dont: {
    caption: 'The main action hidden in a menu with a single item: one extra click for nothing.',
    render: () => <Menu trigger={<Button variant="secondary">Actions</Button>} items={[{ label: 'Save' }]} />,
  },
  accessibility: [
    'The trigger keeps its own accessible name and gets `aria-expanded`; arrow keys and typeahead move through items.',
    'Focus returns to the trigger when the menu closes. Labels are verb-first, like buttons.',
  ],
};
