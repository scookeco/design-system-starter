/**
 * The app's shell composition, shared by every example page: one nav config, one account menu.
 * A product defines this once; each page passes only where it is (current, breadcrumbs) and its content.
 */
import type { ReactNode } from 'react';
import { AppShell, Avatar, Breadcrumbs, Button, Menu, Nav, type BreadcrumbLink, type NavSection } from '../index';

const NAV: readonly NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/home', icon: 'home' },
      { label: 'Records', href: '/records', icon: 'file' },
      { label: 'People', href: '/people', icon: 'users' },
    ],
  },
  { label: 'Workspace', items: [{ label: 'Settings', href: '/settings', icon: 'settings' }] },
];

export interface ExampleShellProps {
  /** href of the primary nav item this page belongs to. */
  current: string;
  /** Ancestors and current page title. Omit on top-level pages. */
  trail?: { items: readonly BreadcrumbLink[]; current: string };
  /** Sticky page action bar (long forms). */
  footer?: ReactNode;
  children: ReactNode;
}

export function ExampleShell({ current, trail, footer, children }: ExampleShellProps) {
  return (
    <AppShell
      brand="Acme"
      nav={<Nav label="Main" sections={NAV} current={current} />}
      breadcrumbs={trail ? <Breadcrumbs items={trail.items} current={trail.current} /> : undefined}
      footer={footer}
      userMenu={
        <Menu
          align="end"
          label="sam.rivera@example.com"
          trigger={
            <Button variant="ghost">
              <Avatar name="Sam Rivera" size="sm" />
            </Button>
          }
          items={[{ label: 'Profile' }, { label: 'Settings', icon: 'settings' }, 'separator', { label: 'Sign out' }]}
        />
      }
    >
      {children}
    </AppShell>
  );
}
