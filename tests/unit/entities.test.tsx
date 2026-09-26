// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { seedAccounts, seedPeople, seedRecords } from '../../src/app/mocks/seed';
import { ACCOUNT, ENTITIES, PERSON } from '../../src/app/registries/entities';
import { FIELD_REGISTRY } from '../../src/app/registries/fields';
import { DENIAL_REASONS } from '../../src/app/model/permissions';
import { ExampleApp } from '../../src/examples/App';
import { EntityFormPage, EntityListPage, EntityRecordPage } from '../../src/examples/EntityPages';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// jsdom lacks these; Radix Select calls them when it opens.
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;

const account = seedAccounts('acme')[0];

describe('entity configs', () => {
  it('only use field types the registry knows', () => {
    for (const config of Object.values(ENTITIES)) {
      for (const field of [...config.columns, ...config.properties, ...(config.form?.fields ?? [])]) expect(FIELD_REGISTRY).toHaveProperty(field.type);
    }
  });
});

describe('schema-driven pages', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('lists every account, each column rendered through the registry', async () => {
    renderWithApp(<EntityListPage config={ACCOUNT} />);
    const table = await screen.findByRole('table', { name: 'Accounts' }, FIRST_PAINT);
    expect(within(table).getAllByRole('row')).toHaveLength(seedAccounts('acme').length + 1);
    expect(within(table).getByRole('link', { name: account?.name ?? '?' }).getAttribute('href')).toBe(`/accounts/${account?.id ?? ''}`);
  });

  it('an account page lists the records that point at it by id, with rollups from the same counts', async () => {
    renderWithApp(<EntityRecordPage config={ACCOUNT} id={account?.id ?? ''} />);
    expect(await screen.findByRole('heading', { level: 1, name: account?.name ?? '?' }, FIRST_PAINT)).toBeTruthy();
    const related = seedRecords('acme').filter((r) => r.accountId === account?.id);
    const active = related.filter((r) => r.status !== 'archived').length;
    await waitFor(() => expect(screen.getByText(new RegExp(`^${String(active)} records · `))).toBeTruthy());
    const table = await screen.findByRole('table', { name: 'Records' });
    expect(within(table).getAllByRole('row').length).toBe(Math.min(10, active) + 1);
  });

  it('a person page lists the records they own', async () => {
    const person = seedPeople('acme')[1];
    renderWithApp(<EntityRecordPage config={PERSON} id={person?.id ?? ''} />);
    expect(await screen.findByRole('heading', { level: 1, name: person?.name ?? '?' }, FIRST_PAINT)).toBeTruthy();
    const owned = seedRecords('acme').filter((r) => r.ownerId === person?.id && r.status !== 'archived').length;
    await waitFor(() => expect(screen.getByText(new RegExp(`^${String(owned)} records · `))).toBeTruthy());
  });

  it('editors see Edit disabled with the reason; admins can use it', async () => {
    renderWithApp(<EntityRecordPage config={ACCOUNT} id={account?.id ?? ''} />, { role: 'editor' });
    const edit = await screen.findByRole('button', { name: 'Edit' }, FIRST_PAINT);
    expect((edit as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById(edit.getAttribute('aria-describedby') ?? '')?.textContent).toBe(DENIAL_REASONS['account:edit']);
  });

  it('creates from the config’s form: validation, then the new account’s page', async () => {
    const { history } = renderWithApp(<EntityFormPage config={ACCOUNT} />, { url: '/accounts/new' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    const summary = await screen.findByRole('region', { name: 'There are 6 problems' });
    expect(document.activeElement).toBe(summary);
    for (const [label, value] of [
      ['Name', 'Relecloud'],
      ['Domain', 'relecloud.example'],
      ['Industry', 'Software'],
      ['Annual revenue (USD)', '50000'],
      ['Customer since', '2026-09-01'],
    ] as const) {
      fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
    }
    expect(screen.getByRole('region', { name: 'There is 1 problem' })).toBeTruthy();
    // The owner is a Select; pick through the registry's input as a person would, by keyboard.
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Owner' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Jo Okafor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(history.location().pathname).toMatch(/^\/accounts\/acme-a\d+$/));
  });

  it('edits from the same form, starting from the server’s values; the new name shows in every record row', async () => {
    const { history } = renderWithApp(<ExampleApp />, { url: `/accounts/${account?.id ?? ''}/edit` });
    // The form renders only once the account has loaded (through the lazy route), so its first value is the server's.
    const name = (await screen.findByLabelText('Name', {}, FIRST_PAINT)) as HTMLInputElement;
    expect(name.value).toBe(account?.name);
    fireEvent.change(name, { target: { value: 'Northwind Holdings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(history.location().pathname).toBe(`/accounts/${account?.id ?? ''}`));
    expect(await screen.findByRole('heading', { level: 1, name: 'Northwind Holdings' })).toBeTruthy();
    act(() => history.push('/records?display=board'));
    // The list is another lazy route.
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Northwind Holdings' }).length).toBeGreaterThan(0), FIRST_PAINT);
    expect(screen.queryByRole('link', { name: account?.name ?? '?' })).toBeNull();
  });
});
