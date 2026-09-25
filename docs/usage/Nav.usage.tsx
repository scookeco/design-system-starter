import { Nav } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Nav],
  whenToUse: [
    'The app’s primary navigation in AppShell’s `nav` slot, defined once for the app.',
    'A settings sub-nav grouped into Personal and Workspace sections.',
  ],
  whenNotToUse: [
    { situation: 'Switching views of one record in place', instead: '`Tabs`' },
    { situation: 'Showing where a page sits in the hierarchy', instead: '`Breadcrumbs`' },
    { situation: 'Actions', instead: '`Button` or `Menu`' },
  ],
  do: {
    caption: 'A few top-level destinations, grouped, with the current page marked.',
    render: () => (
      <Nav
        label="Settings"
        current="/settings/profile"
        sections={[
          { label: 'Personal', items: [{ label: 'Profile', href: '/settings/profile' }, { label: 'Notifications', href: '/settings/notifications' }] },
          { label: 'Workspace', items: [{ label: 'General', href: '/settings/general' }] },
        ]}
      />
    ),
  },
  dont: {
    caption: 'Actions dressed as destinations: “Export” and “Sign out” don’t lead to a page.',
    render: () => (
      <Nav
        label="Records menu"
        current="/records"
        sections={[{ items: [{ label: 'Records', href: '/records' }, { label: 'Export', href: '/export' }, { label: 'Sign out', href: '/sign-out' }] }]}
      />
    ),
  },
  accessibility: [
    '`label` is required: pages carry several nav landmarks, and each needs a distinct name.',
    'The current item gets `aria-current="page"`, not only a heavier look. Section labels name their lists.',
  ],
};
