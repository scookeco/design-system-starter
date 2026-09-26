/**
 * The example app's route table: every screen, its frame, its page (lazy: one chunk per route) and
 * the capability that guards it. Adding a screen is adding a row. The nav, the guard and the 404
 * all read from here; nothing else knows the list of pages.
 */
import { lazy, type ComponentType } from 'react';
import type { Route, RouteProps } from '../app/routing/routes';
import type { RecordSection } from './RecordPage';
import type { SettingsSection } from './SettingsPage';

/** A lazily loaded page: its module is fetched the first time the route matches. */
const page = (load: () => Promise<ComponentType<RouteProps>>) => lazy(async () => ({ default: await load() }));

/** A page that takes nothing from the path. */
const noParams = (Page: ComponentType) => () => <Page />;

const Dashboard = page(async () => noParams((await import('./DashboardPage')).DashboardPage));
const List = page(async () => noParams((await import('./ListPage')).ListPage));
const Create = page(async () => noParams((await import('./CreateEditFlow')).CreateEditFlow));
const Record = page(async () => {
  const { RecordPage } = await import('./RecordPage');
  return ({ params }) => <RecordPage recordId={params.id ?? ''} initialSection={(params.section as RecordSection | undefined) ?? 'overview'} />;
});
const Settings = page(async () => {
  const { SettingsPage } = await import('./SettingsPage');
  return ({ params }) => <SettingsPage initialSection={(params.section as SettingsSection | undefined) ?? 'profile'} />;
});
const Setup = page(async () => noParams((await import('./SetupWizard')).SetupWizard));

export const ROUTES: readonly Route[] = [
  { path: '/', layout: 'shell', page: Dashboard, guard: 'workspace:read', nav: '/home' },
  { path: '/home', layout: 'shell', page: Dashboard, guard: 'workspace:read', nav: '/home' },
  { path: '/records', layout: 'shell', page: List, guard: 'record:read', nav: '/records' },
  { path: '/records/new', layout: 'shell', page: Create, guard: 'record:create', nav: '/records' },
  { path: '/records/:id', layout: 'shell', page: Record, guard: 'record:read', nav: '/records' },
  { path: '/records/:id/:section', layout: 'shell', page: Record, guard: 'record:read', nav: '/records' },
  { path: '/settings', layout: 'shell', page: Settings, guard: 'workspace:read', nav: '/settings' },
  { path: '/settings/:section', layout: 'shell', page: Settings, guard: 'workspace:read', nav: '/settings' },
  { path: '/setup', layout: 'focused', page: Setup, guard: 'workspace:manage', nav: '' },
];
