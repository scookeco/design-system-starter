import { AppShell, Button, Cluster, FocusedLayout, Nav, PageHeader, Stepper, Text } from '../../src/index';
import type { UsageDoc } from './types';

const steps = [{ label: 'Workspace' }, { label: 'Invite' }, { label: 'Review' }];

export const usage: UsageDoc = {
  covers: [FocusedLayout],
  whenToUse: [
    'A task that takes over the screen until it is done or abandoned: first-run setup, a multi-step create, a checkout.',
    'The header names the task (plain text) and always offers `exit`; the column holds a `Stepper`, the step’s `PageHeader` and its form; `footer` holds Back · Next.',
    'Copy the Setup wizard example.',
  ],
  whenNotToUse: [
    { situation: 'Everyday pages', instead: '`AppShell`' },
    { situation: 'Signed-out pages', instead: '`AuthLayout`' },
    { situation: 'A single-page form', instead: '`AppShell` with its `footer` action bar (the Create and edit example)' },
  ],
  do: {
    caption: 'The task and a way out in the header; one column; the step actions in a sticky bar.',
    render: () => (
      <FocusedLayout
        brand="Acme"
        task="Set up your workspace"
        exit={<Button variant="ghost">Exit setup</Button>}
        footer={
          <Cluster justify="end">
            <Button>Next</Button>
          </Cluster>
        }
      >
        <Stepper label="Setup steps (do example)" steps={steps} current={0} />
        <PageHeader title="Name your workspace" />
      </FocusedLayout>
    ),
  },
  dont: {
    caption: 'A wizard inside the app shell: the full navigation invites people to leave half-way, and nothing says how to exit safely.',
    render: () => (
      <AppShell
        brand="Acme"
        nav={<Nav label="Main (don’t example)" sections={[{ items: [{ label: 'Home', href: '/home', icon: 'home' }] }]} />}
        skipLinkLabel="Skip to content (don’t example)"
        sidebarStorageKey={null}
      >
        <Text>Step 1 of 3: Name your workspace</Text>
      </AppShell>
    ),
  },
  accessibility: [
    'Provides banner (the header) and main landmarks; the step’s `PageHeader` is the page’s h1, and the task name in the header is not a heading.',
    'The exit is required, so a focused task never traps anyone.',
    'On a step change, move focus to the new step’s h1 (`PageHeader`’s `headingRef`), as the example does.',
  ],
};
