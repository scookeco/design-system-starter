// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { currentSession, db } from '../../src/app/mocks/db';
import { anotherUser, mockLive } from '../../src/app/mocks/live';
import { draftStorage } from '../../src/app/model/drafts';
import { AppProviders } from '../../src/app/providers';
import { useAppSession } from '../../src/app/session';
import { createMemoryHistory } from '../../src/app/url/history';
import { useNavigate } from '../../src/app/url/useUrlState';
import { CreateEditFlow } from '../../src/examples/CreateEditFlow';
import { renderWithApp, setupMockApi, testClient } from './app-harness';

// jsdom has no ResizeObserver; the create form's RadioGroup (Radix) measures with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
setupMockApi();

const NEW_KEY = 'acme:u-sam:record:new';
const nameField = () => screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;

/** A button that navigates in-app, as a link through AppLink would. */
function Leave({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      Go elsewhere
    </button>
  );
}

const openCreate = async () => {
  const view = renderWithApp(
    <>
      <CreateEditFlow />
      <Leave to="/records" />
    </>,
    { url: '/records/new' },
  );
  await screen.findByRole('combobox', { name: 'Owner' });
  return view;
};

describe('draft ownership: autosave and restore', () => {
  it('keeps a typed draft on the device and brings it back, with Discard', async () => {
    const first = await openCreate();
    fireEvent.change(nameField(), { target: { value: 'Half-typed lease' } });
    await waitFor(() => expect(draftStorage.read<{ name: string }>(NEW_KEY)?.values.name).toBe('Half-typed lease'));
    first.unmount();

    await openCreate();
    expect(nameField().value).toBe('Half-typed lease');
    fireEvent.click(screen.getByRole('button', { name: 'Discard them' }));
    await waitFor(() => expect(nameField().value).toBe(''));
    expect(draftStorage.read(NEW_KEY)).toBeUndefined();
  });

  it('still works when storage throws (full, disabled or blocked)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    await openCreate();
    fireEvent.change(nameField(), { target: { value: 'Typed anyway' } });
    expect(nameField().value).toBe('Typed anyway');
  });

  it('sign-out clears every draft on the device', async () => {
    draftStorage.write(NEW_KEY, { values: { name: 'Private' }, base: undefined, savedAt: 0 });
    let app: ReturnType<typeof useAppSession> | undefined;
    function Handle() {
      app = useAppSession();
      return null;
    }
    render(
      <AppProviders session={currentSession()} tenant="acme" queryClient={testClient()} history={createMemoryHistory('/')} signedOut={<p>Signed out</p>}>
        <Handle />
      </AppProviders>,
    );
    await act(async () => app?.signOut());
    expect(draftStorage.read(NEW_KEY)).toBeUndefined();
  });
});

describe('the unsaved-changes guard', () => {
  it('a clean form lets navigation through', async () => {
    const { history } = await openCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    expect(history.location().pathname).toBe('/records');
  });

  it('a dirty form holds it and asks: Keep editing stays, Leave keeps the draft', async () => {
    const { history } = await openCreate();
    fireEvent.change(nameField(), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    expect(await screen.findByRole('dialog', { name: 'Leave with unsaved changes?' })).toBeTruthy();
    expect(history.location().pathname).toBe('/records/new');
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(history.location().pathname).toBe('/records/new');

    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leave, keep draft' }));
    expect(history.location().pathname).toBe('/records');
    expect(draftStorage.read<{ name: string }>(NEW_KEY)?.values.name).toBe('Unsaved');
  });

  it('Discard and leave drops the draft', async () => {
    const { history } = await openCreate();
    fireEvent.change(nameField(), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard and leave' }));
    expect(history.location().pathname).toBe('/records');
    expect(draftStorage.read(NEW_KEY)).toBeUndefined();
  });

  it('closing the tab with a dirty form gets the browser’s prompt', async () => {
    await openCreate();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    fireEvent.change(nameField(), { target: { value: 'Unsaved' } });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe('the record moves on underneath an edit', () => {
  const ID = 'r-1001';
  const openEdit = async () => {
    renderWithApp(<CreateEditFlow recordId={ID} />, { url: `/records/${ID}/edit`, live: mockLive });
    await screen.findByRole('combobox', { name: 'Owner' });
  };

  it('a clean form follows it quietly', async () => {
    await openEdit();
    act(() => void anotherUser('acme', { kind: 'edit', id: ID, changes: { name: 'Renamed elsewhere' } }));
    await waitFor(() => expect(nameField().value).toBe('Renamed elsewhere'));
    expect(screen.queryByText('This record changed while you were editing')).toBeNull();
  });

  it('a dirty form keeps what was typed, warns, and Review shows yours and theirs', async () => {
    await openEdit();
    fireEvent.change(nameField(), { target: { value: 'Mine' } });
    act(() => void anotherUser('acme', { kind: 'edit', id: ID, changes: { name: 'Theirs' } }));
    expect(await screen.findByText('This record changed while you were editing')).toBeTruthy();
    expect(nameField().value).toBe('Mine');
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    await screen.findByRole('table', { name: 'Your changes and theirs' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine (overwrite)' }));
    await screen.findByText('Your changes were saved.');
    expect((db('acme').records.find((r) => r.id === ID) as RecordEntity).name).toBe('Mine');
    // Saved: nothing left to guard or restore.
    expect(draftStorage.read(`acme:u-sam:record:${ID}`)).toBeUndefined();
  });
});
