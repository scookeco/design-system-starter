// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { deleteJob, listJobs, postBulkDeleteJob, postCancelJob } from '../../src/app/api/jobs';
import type { Job } from '../../src/app/api/schemas';
import { jobSettings } from '../../src/app/model/jobs';
import { canDelete } from '../../src/app/model/predicates';
import { db } from '../../src/app/mocks/db';
import { JOB_CHUNK, seedJob } from '../../src/app/mocks/jobs';
import { ListPage } from '../../src/examples/ListPage';
import { RecordPage } from '../../src/examples/RecordPage';
import { renderWithApp, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const DRAFTS = { q: '', status: [], view: 'drafts' } as const;
const drafts = () => db('acme').records.filter((r) => r.status === 'draft');
const poll = async (id: string) => (await listJobs('acme')).items.find((j) => j.id === id) as Job;

describe('jobs: truthful status', () => {
  it('starting one is 202 and queued: nothing is deleted, or said to be, yet', async () => {
    const before = drafts().length;
    const job = await postBulkDeleteJob('acme', { filter: DRAFTS, label: 'Delete drafts' });
    expect(job).toMatchObject({ state: 'queued', total: before, done: 0, failed: [] });
    expect(drafts()).toHaveLength(before);
  });

  it('moves chunk by chunk to the end; items on legal hold fail with a reason, and it still succeeds', async () => {
    const onHold = drafts().filter((r) => !canDelete(r)).length;
    const { id, total } = await postBulkDeleteJob('acme', { filter: DRAFTS, label: 'Delete drafts' });
    expect((await poll(id)).state).toBe('running');
    const first = await poll(id);
    expect(first.done).toBe(Math.min(JOB_CHUNK, total));
    let job = first;
    while (job.state === 'running') job = await poll(id);
    expect(job).toMatchObject({ state: 'succeeded', done: total });
    expect(job.failed).toHaveLength(onHold);
    expect(job.failed.every((f) => f.reason === 'on legal hold')).toBe(true);
    expect(drafts()).toHaveLength(onHold);
  });

  it('cancel stops between chunks: what was deleted stays deleted, and the count says how far it got', async () => {
    const before = drafts().length;
    const { id } = await postBulkDeleteJob('acme', { filter: DRAFTS, label: 'Delete drafts' });
    await poll(id);
    await poll(id);
    const cancelled = await postCancelJob('acme', id);
    expect(cancelled).toMatchObject({ state: 'cancelled', done: JOB_CHUNK });
    expect((await poll(id)).done).toBe(JOB_CHUNK);
    expect(drafts().length).toBe(before - JOB_CHUNK + cancelled.failed.length);
    await expect(postCancelJob('acme', id)).rejects.toMatchObject({ status: 409 });
  });

  it('a job that stops says so, with why; a running one can’t be dismissed, a finished one can', async () => {
    const { id } = await postBulkDeleteJob('acme', { filter: DRAFTS, label: 'Delete drafts' });
    await expect(deleteJob('acme', id)).rejects.toMatchObject({ status: 409 });
    const mock = db('acme').jobs.find((j) => j.id === id);
    if (mock) mock.failAt = 15;
    let job = await poll(id);
    while (job.state === 'running' || job.state === 'queued') job = await poll(id);
    expect(job).toMatchObject({ state: 'failed', done: 15 });
    expect(job.error).toMatch(/stopped/);
    await deleteJob('acme', id);
    expect((await listJobs('acme')).items.find((j) => j.id === id)).toBeUndefined();
  });
});

describe('the job surfaces', () => {
  it('“Delete all matching” starts a job; the list shows it through to “done, N failed” with Retry failed', async () => {
    jobSettings.pollMs = 5;
    renderWithApp(<ListPage initialSelection="matching" initialBulkDelete="submit" />, { url: '/records?view=drafts' });
    const banner = await screen.findByText(/^Delete \d+ records$/);
    expect(banner).toBeTruthy();
    await screen.findByText('Finished, with failures', {}, { timeout: 5000 });
    expect(screen.getByRole('button', { name: /^Retry \d+ failed$/ })).toBeTruthy();
  });

  it('follows the person to another page, in the shell’s Jobs popover', async () => {
    seedJob('acme', { state: 'running' });
    renderWithApp(<RecordPage initialJobsOpen />, { url: '/records/r-1001' });
    const popover = await screen.findByRole('dialog', { name: 'Jobs' });
    expect(within(popover).getByRole('progressbar', { name: 'Delete 59 drafts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 job running' })).toBeTruthy();
    fireEvent.click(within(popover).getByRole('button', { name: 'Cancel job' }));
    await within(popover).findByText('Cancelled');
  });
});
