// @vitest-environment jsdom
/**
 * The CSV import: its parser, its rules (shared by the wizard's preview and the mock server), the
 * import as a job (partial failure, retry, idempotency, permissions), and the wizard end to end.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { postImportJob, postRetryJob } from '../../src/app/api/imports';
import { listJobs, postCancelJob } from '../../src/app/api/jobs';
import type { Job } from '../../src/app/api/schemas';
import { db, setRoles } from '../../src/app/mocks/db';
import { SAMPLE_IMPORT_BROKEN, SAMPLE_IMPORT_FILE, sampleImportCsv } from '../../src/app/mocks/importSample';
import { importContext, TIMEOUT_REASON } from '../../src/app/mocks/jobs';
import { parseCsv, parseCsvRows, toCsv } from '../../src/app/model/csv';
import { guessMapping, mappingProblems, mapRows, previewImport, validateImportRow } from '../../src/app/model/importRules';
import { jobSettings } from '../../src/app/model/jobs';
import { ImportWizard } from '../../src/examples/ImportWizard';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const sample = () => {
  const { headers, rows } = parseCsv(sampleImportCsv('acme'));
  return mapRows(rows, guessMapping(headers));
};
const poll = async (id: string) => (await listJobs('acme')).items.find((j) => j.id === id) as Job;
const runToEnd = async (id: string) => {
  let job = await poll(id);
  while (job.state === 'queued' || job.state === 'running') job = await poll(id);
  return job;
};

describe('CSV', () => {
  it('reads quoted fields, doubled quotes, line breaks in quotes, CRLF and a byte-order mark', () => {
    expect(parseCsvRows('﻿a,b\r\n"x, y","say ""hi"""\n"two\nlines",\n\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['two\nlines', ''],
    ]);
    expect(parseCsv('Name,Amount\nLease').rows).toEqual([['Lease', '']]);
    expect(parseCsv('').headers).toEqual([]);
  });

  it('writes what it reads', () => {
    const rows = [['Row', 'Reason'], ['Row 2 · A, B', 'Said "no"']];
    expect(parseCsvRows(toCsv(rows))).toEqual(rows);
  });
});

describe('import rules, shared by the preview and the server', () => {
  it('matches columns to fields by name and alias, and says what a mapping is missing', () => {
    const headers = parseCsv(sampleImportCsv('acme')).headers;
    const mapping = guessMapping(headers);
    expect(mapping).toEqual({ name: 0, owner: 1, account: 2, status: 3, amount: 4, renewsOn: 5 });
    expect(mappingProblems(mapping, headers)).toEqual([]);
    expect(mappingProblems({ ...mapping, name: -1, account: 1 }, headers)).toEqual([
      'Choose the column that holds each record’s name.',
      '“Owner email” is chosen for both Owner and Account. Choose it once.',
    ]);
  });

  it('finds the sample’s five broken rows, each with the field and the fix', () => {
    const { ready, invalid } = previewImport(sample(), importContext('acme'));
    expect(invalid.map((r) => r.row)).toEqual(Object.keys(SAMPLE_IMPORT_BROKEN).map(Number));
    expect(ready).toHaveLength(43);
    expect(invalid.map((r) => r.problems[0]?.field)).toEqual(['owner', 'amount', 'renewsOn', 'status', 'name']);
    expect(invalid[1]?.problems[0]?.message).toMatch(/no currency sign/);
  });

  it('turns cells into a record: names and emails to ids, major units to minor, defaults for empty cells', () => {
    const context = importContext('acme');
    const account = context.accounts[0];
    const result = validateImportRow({ row: 2, cells: { name: 'Hosting', owner: 'PRIYA NATARAJAN', account: account?.domain ?? '', status: 'overdue', amount: '1250.5', renewsOn: '' } }, context);
    expect(result).toEqual({
      record: { name: 'Hosting', ownerId: 'acme-p02', accountId: account?.id, status: 'overdue', amountMinor: 125_050, renewsOn: '2027-09-25' },
    });
    expect(validateImportRow({ row: 3, cells: { name: 'Bad', renewsOn: '2027-02-30' } }, context)).toMatchObject({ problems: [{ field: 'renewsOn' }] });
  });
});

describe('the import job', () => {
  it('is 202 and queued, creates records chunk by chunk, and lists the rows that failed with why', async () => {
    const before = db('acme').records.length;
    const rows = previewImport(sample(), importContext('acme')).ready;
    const job = await postImportJob('acme', { rows, file: SAMPLE_IMPORT_FILE, idempotencyKey: 'k1' });
    expect(job).toMatchObject({ kind: 'import', state: 'queued', total: 43, done: 0, label: 'Import 43 rows from renewals.csv' });
    expect(db('acme').records).toHaveLength(before);
    const done = await runToEnd(job.id);
    expect(done).toMatchObject({ state: 'succeeded', done: 43 });
    // Rows 26 and 39 time out on a first attempt (13 is one of the broken rows, never sent).
    expect(done.failed.map((f) => [f.id, f.reason])).toEqual([
      ['row-26', TIMEOUT_REASON],
      ['row-39', TIMEOUT_REASON],
    ]);
    expect(db('acme').records).toHaveLength(before + 41);
  });

  it('retries what failed as a new job, which goes through', async () => {
    const rows = previewImport(sample(), importContext('acme')).ready;
    const first = await runToEnd((await postImportJob('acme', { rows, file: SAMPLE_IMPORT_FILE, idempotencyKey: 'k2' })).id);
    const retry = await postRetryJob('acme', first.id);
    expect(retry).toMatchObject({ kind: 'import', total: 2, label: 'Retry 2 failed rows' });
    expect(await runToEnd(retry.id)).toMatchObject({ state: 'succeeded', done: 2, failed: [] });
  });

  it('answers a replayed request with the same job, never a second import', async () => {
    const rows = sample().slice(0, 3);
    const a = await postImportJob('acme', { rows, file: 'a.csv', idempotencyKey: 'same' });
    const b = await postImportJob('acme', { rows, file: 'a.csv', idempotencyKey: 'same' });
    expect(b.id).toBe(a.id);
    expect((await listJobs('acme')).items.filter((j) => j.kind === 'import')).toHaveLength(1);
  });

  it('needs record:create to start or cancel, not record:delete', async () => {
    setRoles('editor');
    const job = await postImportJob('acme', { rows: sample().slice(0, 3), file: 'a.csv', idempotencyKey: 'k3' });
    expect((await postCancelJob('acme', job.id)).state).toBe('cancelled');
    setRoles('viewer');
    await expect(postImportJob('acme', { rows: sample().slice(0, 3), file: 'a.csv', idempotencyKey: 'k4' })).rejects.toMatchObject({ status: 403 });
  });
});

describe('the import wizard', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('maps, reviews, imports as a job, and retries the rows that failed', async () => {
    jobSettings.pollMs = 5;
    const { history } = renderWithApp(<ImportWizard initialFile={{ name: SAMPLE_IMPORT_FILE, text: sampleImportCsv('acme') }} />, { url: '/import/records' });
    expect(await screen.findByText(/^48 rows and 6 columns/, {}, FIRST_PAINT)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Match columns to fields' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('43 of 48 rows are ready to import')).toBeTruthy();
    const problems = screen.getByRole('table', { name: 'Rows with problems' });
    expect(within(problems).getAllByRole('row')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Import 43 records' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Imported, with some rows failed' }, { timeout: 15_000 })).toBeTruthy();
    expect(screen.getByText('41 imported, 2 failed')).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Rows that failed' })).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Retry 2 failed' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Import finished' }, { timeout: 15_000 })).toBeTruthy();
    expect(screen.getByText('2 records imported')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to records' }));
    expect(history.location().pathname).toBe('/records');
  });

  it('stops Next on a missing required field and says which', async () => {
    renderWithApp(<ImportWizard initialStep={1} initialFile={{ name: 'a.csv', text: 'Owner,Amount\nsam.rivera@example.com,10\n' }} />, { url: '/import/records' });
    await screen.findByRole('table', { name: 'Fields and the columns they read' }, FIRST_PAINT);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByText('Choose the column that holds each record’s name.')).toBeTruthy());
    expect(screen.getByRole('heading', { level: 1, name: 'Match columns to fields' })).toBeTruthy();
  });
});
