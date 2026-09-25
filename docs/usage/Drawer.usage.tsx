import { Button, Checkbox, Dialog, Drawer, Stack } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Drawer],
  whenToUse: [
    'A side sheet over the page for work that needs the page as context: a record’s details from a list, a longer set of filters, navigation on a narrow screen.',
    '`side="end"` (default) for details and filters; `side="start"` with `size="sm"` for navigation. AppShell already opens its nav this way on narrow screens.',
    'Put the primary action last in `footer`; it stays pinned while the body scrolls.',
  ],
  whenNotToUse: [
    { situation: 'A short confirmation or a small form', instead: '`Dialog`' },
    { situation: 'Three or four quick filter options', instead: '`Popover`' },
    { situation: 'Content people need beside the page while they keep working in it', instead: '`PageLayout`’s aside' },
  ],
  do: {
    caption: 'Filters in a drawer from the end, opened by a labelled button, applied from the footer.',
    render: () => (
      <Drawer
        title="Filters"
        description="Narrow the list. Applies when you choose Show."
        trigger={<Button variant="secondary">Filters</Button>}
        footer={<Button>Show 12 records</Button>}
      >
        <Checkbox label="Active" defaultChecked />
      </Drawer>
    ),
  },
  dont: {
    caption: 'A confirmation in a drawer: a full-height sheet for one sentence and two buttons; a Dialog is the right size.',
    render: () => (
      <Stack gap="xs" align="start">
        <Drawer title="Delete record?" description="This cannot be undone." trigger={<Button variant="danger">Delete record</Button>} />
        <Dialog title="Delete record?" description="This cannot be undone." trigger={<Button variant="secondary">Dialog instead</Button>} />
      </Stack>
    ),
  },
  accessibility: [
    'A modal dialog named by its required `title` (kept as the name when `hideTitle` hides it). Focus moves in, stays trapped, and returns to the trigger on close.',
    'Escape, the close button (named by `closeLabel`) and a click on the scrim all close it; the page behind is inert.',
    'The trigger gets `aria-expanded` and `aria-controls` automatically.',
  ],
};
