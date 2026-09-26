import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockApi, mockApiMeta } from '../app/mocks/storybook';
import { ACCOUNT, PERSON } from '../app/registries/entities';
import { EntityFormPage, EntityListPage, EntityRecordPage } from './EntityPages';

// Accounts and people, rendered from their entity config (src/app/registries/entities.ts) through
// the field registry: no hand-built page per entity. (A line comment on purpose: a doc comment on
// the meta becomes docs parameters and would replace the spread mockApiMeta parameters.)
const meta = {
  title: 'Examples/Entity pages',
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const AccountsList: Story = { render: () => <EntityListPage config={ACCOUNT} /> };
/** The record page: properties from the config, and the records that point at this account by id, with rollups. */
export const AccountRecord: Story = { render: () => <EntityRecordPage config={ACCOUNT} id="acme-a01" /> };
/** Editors can't edit accounts (admins only): Edit is disabled, with the reason beside it. */
export const AccountRecordAsEditor: Story = { parameters: mockApi({ role: 'editor' }), render: () => <EntityRecordPage config={ACCOUNT} id="acme-a01" /> };
export const NewAccount: Story = { render: () => <EntityFormPage config={ACCOUNT} /> };
export const NewAccountInvalid: Story = { render: () => <EntityFormPage config={ACCOUNT} initialDraft={{ name: 'Relecloud', arr: '-5' }} initialSubmitted /> };
/** Edit: the same form, starting from what the server has. */
export const EditAccount: Story = { render: () => <EntityFormPage config={ACCOUNT} id="acme-a01" /> };
export const PeopleList: Story = { render: () => <EntityListPage config={PERSON} /> };
/** A person's page: the records they own, joined by owner id. */
export const PersonRecord: Story = { render: () => <EntityRecordPage config={PERSON} id="acme-p02" /> };
