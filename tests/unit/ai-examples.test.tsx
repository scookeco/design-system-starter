// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { db, setRoles } from '../../src/app/mocks/db';
import { useApplyProposal } from '../../src/app/model/ai';
import { AiReviewChanges } from '../../src/examples/AiReviewChanges';
import { AssistantChatPage } from '../../src/examples/AssistantChatPage';
import { ExampleApp } from '../../src/examples/App';
import { RecordCopilot } from '../../src/examples/RecordCopilot';
import { renderWithApp, server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Record copilot', () => {
  it('answers beside the record, citing its fields, and a citation follows through to its source', async () => {
    renderWithApp(<RecordCopilot recordId="r-1001" initialPrompt="When does this renew?" />);
    const panel = await screen.findByRole('complementary', { name: 'Assistant' });
    const citation = await within(panel).findByRole('link', { name: 'Source 1: Renews on' });
    expect(within(panel).getByText('Read record: done')).toBeTruthy();
    fireEvent.click(citation);
    expect(document.activeElement?.getAttribute('aria-current')).toBe('true');
    expect(document.activeElement?.textContent).toContain('Renews on');
    // The record page itself is the existing one.
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
  });
});

describe('AI bulk changes', () => {
  const overdueWithRenewal = () => db('acme').records.filter((r) => r.status === 'overdue' && r.tags.includes('renewal'));

  it('applies only accepted changes, through moveRecord, and one Undo puts them back', async () => {
    const targets = overdueWithRenewal().map((r) => r.id);
    expect(targets.length).toBeGreaterThan(1);
    renderWithApp(<AiReviewChanges initialRun />);
    const review = await screen.findByRole('region', { name: /^Proposed changes to/ });
    expect(db('acme').records.filter((r) => targets.includes(r.id)).every((r) => r.status === 'overdue')).toBe(true);

    const first = targets.map((id) => db('acme').records.find((r) => r.id === id)).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))[0];
    fireEvent.click(within(within(review).getByRole('group', { name: `Status of ${first?.name ?? ''}` })).getByRole('button', { name: 'Accept' }));
    fireEvent.click(within(review).getByRole('button', { name: 'Apply 1 accepted' }));
    await within(review).findByText('1 applied.');
    const statuses = () => targets.map((id) => db('acme').records.find((r) => r.id === id)?.status);
    expect(statuses().filter((s) => s === 'pending')).toHaveLength(1);

    fireEvent.click(within(review).getByRole('button', { name: 'Undo' }));
    await within(review).findByText('Undone. Everything is back as it was.');
    expect(statuses().every((s) => s === 'overdue')).toBe(true);
  });

  it('disables the agent for a viewer, and a viewer’s apply is refused before any request is sent', async () => {
    setRoles('viewer');
    renderWithApp(<AiReviewChanges />);
    const propose = screen.getByRole('button', { name: 'Propose changes' }) as HTMLButtonElement;
    expect(propose.disabled).toBe(true);
    expect(screen.getByText('You have view-only access, so you can’t move records. Ask a workspace admin for editor access.')).toBeTruthy();

    let requests = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/status')) requests += 1;
    });
    const record = overdueWithRenewal()[0];
    const { result } = renderHook(() => useApplyProposal(), { wrapper: wrapperFor(testClient()) });
    const outcome = await act(() =>
      result.current.apply.mutateAsync({
        ids: [record?.id ?? ''],
        moves: [{ recordId: record?.id ?? '', name: record?.name ?? '', before: 'overdue', after: 'pending', version: record?.version ?? 0, reason: '' }],
      }),
    );
    expect(outcome.outcomes[record?.id ?? '']).toMatchObject({ ok: false });
    expect(requests).toBe(0);
    server.events.removeAllListeners();
  });
});

describe('Assistant chat page', () => {
  it('opens a conversation from the URL, and a first question in a new chat creates one, named after the question', async () => {
    const { history } = renderWithApp(<AssistantChatPage />, { url: '/assistant?c=c-3' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Overdue records this month' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(history.location().search).toBe('');
    fireEvent.click(await screen.findByRole('button', { name: 'How many records are overdue?' }));
    await waitFor(() => expect(history.location().search).toBe('?c=c-4'));
    const nav = await screen.findByRole('navigation', { name: 'Conversations' });
    await within(nav).findByRole('link', { name: 'How many records are overdue?' });
  });
});

describe('AI routes', () => {
  it('guards each AI page by what it does: a viewer can chat but gets the 403 page for bulk changes', async () => {
    setRoles('viewer');
    renderWithApp(<ExampleApp />, { url: '/assistant/tidy-overdue' });
    expect(await screen.findByRole('heading', { level: 1, name: 'You don’t have access to this page' })).toBeTruthy();
    cleanup();
    renderWithApp(<ExampleApp />, { url: '/assistant' });
    expect(await screen.findByRole('heading', { level: 1, name: 'New chat' })).toBeTruthy();
  });
});
