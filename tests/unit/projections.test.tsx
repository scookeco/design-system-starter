// @vitest-environment jsdom
/**
 * Memoised projections: a 10,000-row list isn't projected again on a render that changed nothing,
 * and an edit re-projects only the row it touched. Identity is the proof: toRow builds a new object
 * every time it runs, so getting the same object back means it didn't run.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { patchListedRecord } from '../../src/app/model/mutations';
import { toBoard, toRow, toRows } from '../../src/app/model/projections';
import { useRecordList } from '../../src/app/model/queries';
import { seedRecords } from '../../src/app/mocks/seed';
import { setupMockApi, testClient, wrapperFor } from './app-harness';

setupMockApi();

const ACME = ['acme', 'admin'] as const;
const QUERY = { view: 'all', q: '', status: [], sort: 'name', page: 1, pageSize: 100 } as const;

describe('projections are memoised by identity', () => {
  it('the same records give back the same rows, without projecting again', () => {
    const records = seedRecords('acme');
    const first = toRows(records);
    expect(toRows(records)).toBe(first);
    expect(toRow(records[0] as RecordEntity)).toBe(first[0]);
    expect(toRows(undefined)).toBe(toRows(undefined));
  });

  it('an edit to one record re-projects that row only', () => {
    const records = seedRecords('acme');
    const before = toRows(records);
    const edited = records.map((r, i) => (i === 3 ? { ...r, name: 'Edited' } : r));
    const after = toRows(edited);
    expect(after).not.toBe(before);
    expect(after[3]).not.toBe(before[3]);
    expect(after[3]?.name).toBe('Edited');
    expect(after.filter((row, i) => row !== before[i])).toHaveLength(1);
  });

  it('the board is the same columns for the same rows, view and filter', () => {
    const rows = toRows(seedRecords('acme'));
    const board = toBoard(rows, 'open', []);
    expect(toBoard(rows, 'open', [])).toBe(board);
    expect(toBoard(rows, 'open', ['pending'])).not.toBe(board);
  });

  it('in a component: an unrelated re-render keeps the rows; a patched record changes one row', async () => {
    const client = testClient();
    const { result } = renderHook(
      () => {
        const [, setTick] = useState(0);
        const list = useRecordList(QUERY);
        return { rows: toRows(list.data?.items), rerender: () => setTick((n) => n + 1) };
      },
      { wrapper: wrapperFor(client) },
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(100));
    const loaded = result.current.rows;
    // State that has nothing to do with the list changes: the rows are the very same array.
    act(() => result.current.rerender());
    act(() => result.current.rerender());
    expect(result.current.rows).toBe(loaded);

    // A write patches one record in the cached page (as every record write and live event does).
    const target = loaded[7];
    act(() => {
      patchListedRecord(client, ACME, target?.id ?? '', (r) => ({ ...r, name: 'Patched in place' }));
    });
    await waitFor(() => expect(result.current.rows[7]?.name).toBe('Patched in place'));
    const patched = result.current.rows;
    expect(patched).not.toBe(loaded);
    expect(patched.filter((row, i) => row !== loaded[i])).toHaveLength(1);
    expect(client.getQueryData(recordKeys.list(ACME, QUERY))).toBeDefined();
  });
});
