import { Button, Cluster, Tooltip } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Tooltip],
  whenToUse: [
    'Naming an icon-only control on hover and focus (with the same words as its `aria-label`).',
    'A short supplemental hint that nobody needs to complete the task.',
  ],
  whenNotToUse: [
    { situation: 'Information people need', instead: 'visible text: a field `description`, or `Text` on the page' },
    { situation: 'Interactive content such as links or buttons', instead: 'a `Dialog` or the page itself' },
  ],
  do: {
    caption: 'The visible label stays; the tooltip adds a hint about when the action applies.',
    render: () => (
      <Cluster>
        <Tooltip content="Downloads every row that matches the filters">
          <Button variant="secondary" icon="download">
            Export CSV
          </Button>
        </Tooltip>
      </Cluster>
    ),
  },
  dont: {
    caption: 'The only explanation of a required format hidden in a tooltip: touch users never see it.',
    render: () => (
      <Cluster>
        <Tooltip content="Use the format AB-1234">
          <Button variant="ghost">Reference</Button>
        </Tooltip>
      </Cluster>
    ),
  },
  accessibility: [
    'Opens on hover and keyboard focus, closes on Escape; the trigger keeps its own accessible name.',
    'Wrap a focusable element (a system Button): a tooltip on non-focusable content is unreachable by keyboard.',
  ],
};
