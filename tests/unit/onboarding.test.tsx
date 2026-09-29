// @vitest-environment jsdom
/**
 * The first-run checklist: steps the server works out from the workspace (never stored), a dismiss
 * that persists and can be undone, and the checklist on Home for admins only.
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { postConnect } from '../../src/app/api/integrations';
import { postImportJob } from '../../src/app/api/imports';
import { listJobs } from '../../src/app/api/jobs';
import { getOnboarding, patchOnboarding } from '../../src/app/api/onboarding';
import { setRoles } from '../../src/app/mocks/db';
import { DashboardPage } from '../../src/examples/DashboardPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, server, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const doneSteps = async () => (await getOnboarding('globex')).steps.filter((s) => s.done).map((s) => s.id);

describe('the mock checklist', () => {
  it('works each step out from the workspace', async () => {
    expect(await doneSteps()).toEqual(['invite']);
    await postConnect('globex', 'relay');
    expect(await doneSteps()).toEqual(['invite', 'connect']);
    const job = await postImportJob('globex', { rows: [{ row: 2, cells: { name: 'Imported lease' } }], file: 'a.csv', idempotencyKey: 'onb' });
    expect(await doneSteps()).toEqual(['invite', 'connect']);
    while ((await listJobs('globex')).items.find((j) => j.id === job.id)?.state !== 'succeeded');
    expect(await doneSteps()).toEqual(['invite', 'import', 'connect']);
  });

  it('keeps a dismiss, and is for people who set the workspace up', async () => {
    expect((await patchOnboarding('acme', true)).dismissed).toBe(true);
    expect((await getOnboarding('acme')).dismissed).toBe(true);
    expect((await patchOnboarding('acme', false)).dismissed).toBe(false);
    setRoles('editor');
    await expect(getOnboarding('acme')).rejects.toMatchObject({ status: 403 });
  });
});

describe('the checklist on Home', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('shows progress in words, links each step, and hides with Undo', async () => {
    renderWithApp(<DashboardPage />, { url: '/home' });
    const progress = await screen.findByRole('progressbar', { name: 'Setup' }, FIRST_PAINT);
    expect(progress.getAttribute('aria-valuetext')).toBe('2 of 3 done');
    expect(screen.getByRole('link', { name: 'Import your records' }).getAttribute('href')).toBe('/import/records');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await screen.findByText('Setup checklist hidden');
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Setup' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Show the setup checklist' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Undo/ }));
    expect(await screen.findByRole('progressbar', { name: 'Setup' })).toBeTruthy();
  });

  it('isn’t there, and isn’t fetched, for an editor', async () => {
    const asked: string[] = [];
    const listener = ({ request }: { request: Request }) => asked.push(new URL(request.url).pathname);
    server.events.on('request:start', listener);
    renderWithApp(<DashboardPage />, { url: '/home', role: 'editor' });
    await screen.findByRole('button', { name: /^Notifications/ }, FIRST_PAINT);
    server.events.removeListener('request:start', listener);
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull();
    expect(asked.some((path) => path.endsWith('/onboarding'))).toBe(false);
  });
});
