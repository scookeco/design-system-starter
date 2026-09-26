import { describe, expect, it } from 'vitest';
import { recordKeys } from '../../src/app/model/keys';
import { canDelete, isOpen, matchesFilter, VIEW_PREDICATES } from '../../src/app/model/predicates';
import { statusOptionsFor, toRow, VIEWS } from '../../src/app/model/projections';
import { STATUS } from '../../src/app/model/status';
import { RECORD_STATUSES, RECORD_VIEWS } from '../../src/app/api/schemas';
import { seedRecords } from '../../src/app/mocks/seed';

const records = seedRecords('acme');
const first = <T,>(items: readonly T[]): T => {
  const item = items[0];
  if (item === undefined) throw new Error('empty');
  return item;
};

describe('predicates', () => {
  it('give every view exactly one predicate, and every status a label and tone', () => {
    expect(Object.keys(VIEW_PREDICATES).sort()).toEqual([...RECORD_VIEWS].sort());
    expect(VIEWS.map((v) => v.view)).toEqual([...RECORD_VIEWS]);
    expect(Object.keys(STATUS).sort()).toEqual([...RECORD_STATUSES].sort());
  });

  it('partition records: every record is in All or Archived, never both', () => {
    for (const record of records) expect(VIEW_PREDICATES.all(record) !== VIEW_PREDICATES.archived(record)).toBe(true);
  });

  it('match search on name or owner, ignoring case and accents', () => {
    const record = { ...first(records), name: 'Café lease', ownerName: 'Zoë Ng' };
    expect(matchesFilter(record, { q: 'cafe', status: [], view: 'all' })).toBe(true);
    expect(matchesFilter(record, { q: 'ZOE', status: [], view: 'all' })).toBe(true);
    expect(matchesFilter(record, { q: 'cafe', status: ['draft'], view: 'all' })).toBe(record.status === 'draft');
  });
});

describe('projections', () => {
  it('derive a row from an entity without copying what it doesn’t need', () => {
    const record = first(records.filter((r) => r.tags.includes('legal-hold')));
    const row = toRow(record);
    expect(row).toMatchObject({ id: record.id, ownerId: record.ownerId, accountId: record.accountId, legalHold: true, deletable: false, status: STATUS[record.status] });
    expect(row.deletable).toBe(canDelete(record));
  });

  it('offer only the statuses a view lets through as filters', () => {
    expect(statusOptionsFor('open').map((o) => o.value)).toEqual(RECORD_STATUSES.filter((status) => isOpen({ status })));
    expect(statusOptionsFor('all').map((o) => o.value)).not.toContain('archived');
  });
});

describe('cache keys', () => {
  it('lead with the partition (tenant, then permission scope), then the resource, then the params', () => {
    const query = { q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 } as const;
    expect(recordKeys.list(['acme', 'admin'], query)).toEqual(['acme', 'admin', 'records', query]);
    expect(recordKeys.list(['acme', 'admin'], query).slice(0, 3)).toEqual(recordKeys.lists(['acme', 'admin']));
    expect(recordKeys.detail(['globex', 'viewer'], 'g-1001')).toEqual(['globex', 'viewer', 'record', { id: 'g-1001' }]);
    // A viewer's list and an admin's are different entries: neither can answer for the other.
    expect(recordKeys.list(['acme', 'viewer'], query)).not.toEqual(recordKeys.list(['acme', 'admin'], query));
  });
});
