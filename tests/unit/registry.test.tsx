// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { seedAccounts, seedPeople, seedRecords } from '../../src/app/mocks/seed';
import { FIELD_REGISTRY, FIELD_TYPES, FieldDisplay, FieldInput, fieldReporting, type DraftValues, type FieldDef, type FieldRegistry, type FieldType, type FieldValues } from '../../src/app/registries/fields';
import { RECORD_PROPERTIES } from '../../src/app/registries/recordFields';
import { createFormatter } from '../../src/format/format';
import { renderWithApp, setupMockApi } from './app-harness';

setupMockApi();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const format = createFormatter({ locale: 'en-US', timeZone: 'UTC' });
const record = seedRecords('acme')[0] as RecordEntity;
const owner = seedPeople('acme').find((p) => p.id === record.ownerId);
const account = seedAccounts('acme').find((a) => a.id === record.accountId);
const context = { format, currency: 'USD', people: owner ? [owner] : [], accounts: account ? [account] : [] };

describe('field registry', () => {
  it('has an entry for every field type', () => {
    expect(Object.keys(FIELD_REGISTRY).sort()).toEqual([...FIELD_TYPES].sort());
  });

  it('fails to compile when a field type has no entry', () => {
    const rest = Object.fromEntries(Object.entries(FIELD_REGISTRY).filter(([type]) => type !== 'tags')) as Omit<FieldRegistry, 'tags'>;
    // @ts-expect-error — "tags" is missing: the registry is keyed on the whole FieldType union.
    const incomplete: FieldRegistry = rest;
    expect(Object.keys(incomplete)).not.toContain('tags');
  });

  it('renders every record property through its entry, joining people and accounts by id', async () => {
    renderWithApp(
      <dl>
        {RECORD_PROPERTIES.map((field) => (
          <dd key={field.id}>
            <FieldDisplay field={field} entity={record} format={format} />
          </dd>
        ))}
      </dl>,
    );
    // References resolve through the people and account caches: the record itself holds only ids.
    expect(await screen.findByText(owner?.name ?? '')).toBeTruthy();
    expect((await screen.findByRole('link', { name: account?.name ?? '' })).getAttribute('href')).toBe(`/accounts/${record.accountId ?? ''}`);
    expect(screen.getByText(format.money(record.amount.minor, record.amount.currency))).toBeTruthy();
    expect(screen.getByText(record.id)).toBeTruthy();
  });

  it('falls back for an unknown type: a placeholder, one report, and no throw', () => {
    const report = vi.spyOn(fieldReporting, 'report').mockImplementation(() => undefined);
    // Data newer than the code: a type this build has never heard of.
    const unknown = { type: 'signature', id: 'signedBy', label: 'Signed by', get: () => 'x' } as unknown as FieldDef<RecordEntity>;
    expect(() =>
      render(
        <>
          <FieldDisplay field={unknown} entity={record} format={format} />
          <FieldDisplay field={unknown} entity={record} format={format} />
        </>,
      ),
    ).not.toThrow();
    expect(screen.getAllByText('Not available')).toHaveLength(2);
    expect(report).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith('signature', 'signedBy');
  });

  it('falls back for an unknown input type too', () => {
    const report = vi.spyOn(fieldReporting, 'report').mockImplementation(() => undefined);
    render(<FieldInput field={{ type: 'rating', id: 'score', label: 'Score' }} inputId="score" value="" onChange={() => undefined} context={context} />);
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(report).toHaveBeenCalledWith('rating', 'score');
  });
});

/**
 * A value and a draft for every field type. Keyed on the FieldType union, so a new type without a
 * sample fails to compile, and gets its own test below.
 */
const SAMPLES: { [K in FieldType]: { value: FieldValues[K]; draft: DraftValues[K] } } = {
  text: { value: record.name, draft: record.name },
  money: { value: record.amount, draft: '12500.50' },
  date: { value: record.renewsOn, draft: '2027-01-31' },
  status: { value: record.status, draft: record.status },
  person: { value: record.ownerId, draft: record.ownerId },
  account: { value: record.accountId, draft: record.accountId ?? '' },
  tags: { value: ['priority', 'renewal'], draft: 'priority, renewal' },
};

describe('every registry entry renders its view and its edit without throwing', () => {
  it.each(FIELD_TYPES)('%s', async (type) => {
    const report = vi.spyOn(fieldReporting, 'report').mockImplementation(() => undefined);
    const sample = SAMPLES[type];
    const field = { type, id: `sample-${type}`, label: `Sample ${type}`, get: () => sample.value } as unknown as FieldDef<RecordEntity>;
    let rendered: ReturnType<typeof renderWithApp> | undefined;
    expect(() => {
      rendered = renderWithApp(
        <>
          <output data-testid="view">
            <FieldDisplay field={field} entity={record} format={format} />
          </output>
          <FieldInput field={field} inputId={`input-${type}`} value={String(sample.draft)} onChange={() => undefined} context={context} />
        </>,
      );
    }).not.toThrow();
    // The view shows something (people and accounts once their directory answers); the input is labelled.
    await waitFor(() => expect(screen.getByTestId('view').textContent).not.toBe(''));
    expect(screen.getByTestId('view').textContent).not.toContain('Not available');
    expect(rendered?.container.querySelector(`#input-${type}`)).not.toBeNull();
    // A known type is never reported as unknown.
    expect(report).not.toHaveBeenCalled();
  });
});
