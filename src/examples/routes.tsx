/**
 * The example app's route table: every screen, its frame, its page (lazy: one chunk per route) and
 * the capability that guards it. Adding a screen is adding a row. The nav, the guard and the 404
 * all read from here; nothing else knows the list of pages.
 */
import { lazy, type ComponentType } from 'react';
import { ACCOUNT, PERSON } from '../app/registries/entities';
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
// Schema-driven: accounts and people get their pages from their entity config, not hand-built ones.
const Entities = () => import('./EntityPages');
const AccountList = page(async () => {
  const { EntityListPage } = await Entities();
  return () => <EntityListPage config={ACCOUNT} />;
});
const AccountRecord = page(async () => {
  const { EntityRecordPage } = await Entities();
  return ({ params }) => <EntityRecordPage config={ACCOUNT} id={params.id ?? ''} />;
});
const AccountForm = page(async () => {
  const { EntityFormPage } = await Entities();
  return ({ params }) => <EntityFormPage config={ACCOUNT} {...(params.id ? { id: params.id } : {})} />;
});
const PeopleList = page(async () => {
  const { EntityListPage } = await Entities();
  return () => <EntityListPage config={PERSON} />;
});
const PersonRecord = page(async () => {
  const { EntityRecordPage } = await Entities();
  return ({ params }) => <EntityRecordPage config={PERSON} id={params.id ?? ''} />;
});
const Setup = page(async () => noParams((await import('./SetupWizard')).SetupWizard));

// AI patterns (PR: AI-native patterns). Under /assistant, so no /records/:id pattern shadows them.
const AssistantChat = page(async () => noParams((await import('./AssistantChatPage')).AssistantChatPage));
const AiNewRecord = page(async () => noParams((await import('./CreateWithAi')).CreateWithAi));
const AiTidyOverdue = page(async () => noParams((await import('./AiReviewChanges')).AiReviewChanges));
const AiRecordCopilot = page(async () => {
  const { RecordCopilot } = await import('./RecordCopilot');
  return ({ params }) => <RecordCopilot recordId={params.id ?? ''} />;
});

export const ROUTES: readonly Route[] = [
  { path: '/', layout: 'shell', page: Dashboard, guard: 'workspace:read', nav: '/home' },
  { path: '/home', layout: 'shell', page: Dashboard, guard: 'workspace:read', nav: '/home' },
  { path: '/records', layout: 'shell', page: List, guard: 'record:read', nav: '/records' },
  { path: '/records/new', layout: 'shell', page: Create, guard: 'record:create', nav: '/records' },
  { path: '/records/:id', layout: 'shell', page: Record, guard: 'record:read', nav: '/records' },
  { path: '/records/:id/:section', layout: 'shell', page: Record, guard: 'record:read', nav: '/records' },
  { path: '/accounts', layout: 'shell', page: AccountList, guard: ACCOUNT.capabilities.read, nav: '/accounts' },
  { path: '/accounts/new', layout: 'shell', page: AccountForm, guard: 'account:create', nav: '/accounts' },
  { path: '/accounts/:id', layout: 'shell', page: AccountRecord, guard: ACCOUNT.capabilities.read, nav: '/accounts' },
  { path: '/accounts/:id/edit', layout: 'shell', page: AccountForm, guard: 'account:edit', nav: '/accounts' },
  { path: '/people', layout: 'shell', page: PeopleList, guard: PERSON.capabilities.read, nav: '/people' },
  { path: '/people/:id', layout: 'shell', page: PersonRecord, guard: PERSON.capabilities.read, nav: '/people' },
  { path: '/settings', layout: 'shell', page: Settings, guard: 'workspace:read', nav: '/settings' },
  { path: '/settings/:section', layout: 'shell', page: Settings, guard: 'workspace:read', nav: '/settings' },
  { path: '/setup', layout: 'focused', page: Setup, guard: 'workspace:manage', nav: '' },
  // --- AI patterns: the assistant runs as the person, so each page is guarded by what it does. ---
  { path: '/assistant', layout: 'shell', page: AssistantChat, guard: 'record:read', nav: '' },
  { path: '/assistant/new-record', layout: 'shell', page: AiNewRecord, guard: 'record:create', nav: '/records' },
  { path: '/assistant/tidy-overdue', layout: 'shell', page: AiTidyOverdue, guard: 'record:move', nav: '/records' },
  { path: '/assistant/records/:id', layout: 'shell', page: AiRecordCopilot, guard: 'record:read', nav: '/records' },
  // --- end AI patterns ---
];
