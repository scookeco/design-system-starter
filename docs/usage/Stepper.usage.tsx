import { NavTabs, Stepper } from '../../src/index';
import type { UsageDoc } from './types';

const steps = [{ label: 'Workspace' }, { label: 'Invite' }, { label: 'Plan' }, { label: 'Review' }];

export const usage: UsageDoc = {
  covers: [Stepper],
  whenToUse: [
    'Showing where someone is in a task whose steps must be done in order: setup, a multi-step create. Pair it with `FocusedLayout` and copy the Setup wizard example.',
    'Three to six steps with short, parallel labels. Keep the list the same on every step.',
  ],
  whenNotToUse: [
    { situation: 'Sections that can be visited in any order', instead: '`NavTabs` (routes) or `Tabs` (panels)' },
    { situation: 'A form with a few sections', instead: 'one page with cards (the Create and edit example)' },
    { situation: 'Progress of a background job', instead: '`Progress`' },
  ],
  do: {
    caption: 'An ordered list: done steps show a check, the current one is marked, the rest show their number.',
    render: () => <Stepper label="Setup steps (do example)" steps={steps} current={2} />,
  },
  dont: {
    caption: 'Ordered steps as navigation tabs: it suggests people can jump to Plan before naming the workspace.',
    render: () => (
      <NavTabs
        label="Setup steps (don’t example)"
        current="/setup/workspace"
        items={steps.map((s) => ({ label: s.label, href: `/setup/${s.label.toLowerCase()}` }))}
      />
    ),
  },
  accessibility: [
    'An ordered list named by the required `label`; the current step has `aria-current="step"`.',
    'Completed steps read “Completed: <label>” (a visually hidden prefix, set with `completedLabel`) and show a check; state is never colour alone.',
    'Steps are not links. Going back is the page’s Back button or a review step’s Edit.',
  ],
};
