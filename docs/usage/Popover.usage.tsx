import { Button, Checkbox, Popover, Tooltip } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Popover],
  whenToUse: [
    'A few controls anchored to the button that opens them, acting on the page as they change: a filter menu of checkboxes, a column picker.',
    'It is non-modal: the page stays usable, Escape or a click outside closes it, and focus returns to the trigger.',
  ],
  whenNotToUse: [
    { situation: 'A list of actions', instead: '`Menu`' },
    { situation: 'A hint on hover or focus', instead: '`Tooltip`' },
    { situation: 'Many filters, or a form with a submit', instead: '`Drawer` or `Dialog`' },
  ],
  do: {
    caption: 'A Filters button that opens a named popover of status checkboxes.',
    render: () => (
      <Popover label="Filter by status (do example)" trigger={<Button variant="secondary">Filters</Button>}>
        <Checkbox label="Active" />
      </Popover>
    ),
  },
  dont: {
    caption: 'Controls in a tooltip: it vanishes when the pointer leaves, and keyboard users can’t reach what is inside.',
    render: () => (
      <Tooltip content="Active · Pending · Overdue">
        <Button variant="secondary">Filters</Button>
      </Tooltip>
    ),
  },
  accessibility: [
    'A dialog named by the required `label`; the trigger gets `aria-expanded` and `aria-controls`.',
    'Focus moves into it on open and back to the trigger on close; Escape closes it.',
  ],
};
