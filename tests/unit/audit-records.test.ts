import { describe, expect, it } from 'vitest';
import { listAudit } from '../../src/app/api/admin';
import { listJobs, postBulkDeleteJob } from '../../src/app/api/jobs';
import { patchRecord, postArchive, postRestore, postStatus } from '../../src/app/api/records';
import type { RecordEntity } from '../../src/app/api/schemas';
import { db } from '../../src/app/mocks/db';
import { setupMockApi } from './app-harness';

setupMockApi();

const latest = async (count: number) => (await listAudit('acme', { actor: '', actions: [], from: '', to: '', page: 1, pageSize: count })).items;
const record = () => db('acme').records.find((r) => r.status === 'active' && r.tags.length === 0) as RecordEntity;

describe('record writes are audited', () => {
  it('rename, edit, tag, untag, move, archive and restore each log their own action, with what changed', async () => {
    const r = record();
    let v = (await patchRecord('acme', r.id, { name: 'Audited name' }, r.version)).version;
    v = (await patchRecord('acme', r.id, { amountMinor: 4_200, ownerId: r.ownerId === 'acme-p03' ? 'acme-p04' : 'acme-p03' }, v)).version;
    v = (await patchRecord('acme', r.id, { tags: ['priority'] }, v)).version;
    v = (await patchRecord('acme', r.id, { tags: [] }, v)).version;
    await postStatus('acme', r.id, 'pending', v);
    v = (await postArchive('acme', r.id)).version;
    await postRestore('acme', r.id, 'pending', v);
    const events = (await latest(7)).reverse();
    expect(events.map((e) => e.action)).toEqual(['record.renamed', 'record.updated', 'record.tagged', 'record.untagged', 'record.moved', 'record.archived', 'record.restored']);
    expect(events.every((e) => e.target.id === r.id && e.outcome === 'success')).toBe(true);
    expect(events[0]?.changes).toEqual([{ field: 'name', before: r.name, after: 'Audited name' }]);
    expect(events[1]?.changes.map((c) => c.field)).toEqual(['ownerId', 'amount']);
    expect(events[4]?.changes).toEqual([{ field: 'status', before: 'active', after: 'pending' }]);
  });

  it('a bulk delete job logs each record it deletes, by the name it had', async () => {
    const { id } = await postBulkDeleteJob('acme', { filter: { q: '', status: [], view: 'drafts' }, label: 'Delete drafts' });
    let job = (await listJobs('acme')).items.find((j) => j.id === id);
    while (job && (job.state === 'queued' || job.state === 'running')) job = (await listJobs('acme')).items.find((j) => j.id === id);
    const deleted = (job?.done ?? 0) - (job?.failed.length ?? 0);
    const events = await latest(deleted + 1);
    expect(events.slice(0, deleted).every((e) => e.action === 'record.deleted' && e.target.type === 'record')).toBe(true);
    expect(events[deleted]?.action).not.toBe('record.deleted');
  });
});
