/**
 * Saved views for the list page: a named combination of tab, search, filters, sort, columns and
 * display, stored as config per person per workspace (the mock API persists it). The URL stays the
 * truth for what's on screen: choosing a view writes its config into the URL (with saved=<id>), and
 * changing anything after that shows "Modified" until it's saved into the view or saved as a new one.
 *
 * Anatomy:
 *   Select   the person's views (the default marked); "Unsaved view" when the URL matches none
 *   Badge    "Modified" when the URL has moved on from the chosen view
 *   Menu     Save as new view… · Save changes · Rename… · Set as default / Stop opening by default ·
 *            Delete view… (destructive last)
 *   Dialogs  a name (save as, rename) and a delete confirmation naming the view
 *
 * The default view opens when the list is opened with nothing in its URL, applied with replace so
 * Back doesn't return to the empty URL. A shared link always wins over the default.
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Cluster, Dialog, Menu, Select, Stack, TextField, useToast, type MenuEntry } from '../index';
import { ApiError } from '../app/api/client';
import { useDeleteView, useSaveView, useUpdateView } from '../app/model/mutations';
import { useSavedViews } from '../app/model/queries';
import { LIST_DEFAULTS, sameConfig, toViewConfig, type ListUrlState } from '../app/url/listState';
import type { UrlStateActions } from '../app/url/useUrlState';

export type SavedViewDialog = 'save' | 'rename' | 'delete';

export interface SavedViewsBarProps {
  url: ListUrlState;
  nav: UrlStateActions<ListUrlState>;
  /** Whether the page's own URL was empty when it opened: only then does the default view apply. */
  openedBare: boolean;
  /** Open a dialog on first render (gallery and tests). */
  initialDialog?: SavedViewDialog | undefined;
}

export function SavedViewsBar({ url, nav, openedBare, initialDialog }: SavedViewsBarProps) {
  const toast = useToast();
  const views = useSavedViews();
  const saveView = useSaveView();
  const updateView = useUpdateView();
  const deleteView = useDeleteView();
  const [dialog, setDialog] = useState<SavedViewDialog | undefined>(initialDialog);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const items = views.data ?? [];
  const active = items.find((v) => v.id === url.saved);
  const current = toViewConfig(url);
  const modified = active !== undefined && !sameConfig(active.config, current);

  // The default view, once, when the list opened with a bare URL.
  const applied = useRef(false);
  const applyDefault = useEffectEvent(() => {
    if (applied.current || !openedBare) return;
    applied.current = true;
    const fallback = items.find((v) => v.isDefault);
    if (fallback) nav.replace({ ...LIST_DEFAULTS, ...fallback.config, saved: fallback.id });
  });
  const loaded = views.isSuccess;
  useEffect(() => {
    if (loaded) applyDefault();
  }, [loaded]);

  // Gallery and tests: a dialog opened on first render starts from the active view's name.
  const seeded = useRef(false);
  const seedName = useEffectEvent(() => {
    if (seeded.current || !initialDialog || !active) return;
    seeded.current = true;
    if (initialDialog === 'rename') setName(active.name);
  });
  useEffect(() => {
    if (loaded) seedName();
  }, [loaded]);

  const open = (next: SavedViewDialog) => {
    setName(next === 'rename' ? (active?.name ?? '') : '');
    setNameError(undefined);
    setDialog(next);
  };
  const close = () => setDialog(undefined);
  const failed = (error: unknown) => setNameError(error instanceof ApiError && error.status === 422 ? error.message : 'The view couldn’t be saved. Try again.');

  const submitName = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      setNameError('Name the view.');
      return;
    }
    if (dialog === 'rename' && active) {
      updateView.mutate(
        { id: active.id, changes: { name: trimmed } },
        {
          onSuccess: () => {
            close();
            toast({ title: 'View renamed', description: trimmed, tone: 'success' });
          },
          onError: failed,
        },
      );
      return;
    }
    saveView.mutate(
      { name: trimmed, config: current },
      {
        onSuccess: (saved) => {
          close();
          nav.replace({ saved: saved.id });
          toast({ title: 'View saved', description: `${trimmed} is in your views.`, tone: 'success' });
        },
        onError: failed,
      },
    );
  };

  const saveChanges = () => {
    if (!active) return;
    updateView.mutate(
      { id: active.id, changes: { config: current } },
      { onSuccess: () => toast({ title: 'View updated', description: active.name, tone: 'success' }) },
    );
  };

  const toggleDefault = () => {
    if (!active) return;
    updateView.mutate(
      { id: active.id, changes: { isDefault: !active.isDefault } },
      { onSuccess: (view) => toast({ title: view.isDefault ? 'Opens by default' : 'No longer the default', description: view.name, tone: 'success' }) },
    );
  };

  const confirmDelete = () => {
    if (!active) return;
    deleteView.mutate(active.id, {
      onSuccess: () => {
        close();
        // What's on screen stays; it just isn't a saved view any more.
        nav.replace({ saved: '' });
        toast({ title: 'View deleted', description: active.name, tone: 'success' });
      },
    });
  };

  const menu: MenuEntry[] = [
    { label: 'Save as new view…', icon: 'plus', onSelect: () => open('save') },
    ...(active
      ? ([
          ...(modified ? [{ label: `Save changes to “${active.name}”`, onSelect: saveChanges }] : []),
          { label: 'Rename…', onSelect: () => open('rename') },
          { label: active.isDefault ? 'Stop opening by default' : 'Open by default', onSelect: toggleDefault },
          'separator',
          { label: 'Delete view…', tone: 'danger', onSelect: () => open('delete') },
        ] satisfies MenuEntry[])
      : []),
  ];

  return (
    <Cluster gap="sm" align="end">
      <Select
        label="Saved view"
        hideLabel
        size="sm"
        placeholder={views.isPending ? 'Loading views…' : 'Unsaved view'}
        options={items.map((v) => ({ value: v.id, label: v.isDefault ? `${v.name} (default)` : v.name }))}
        value={active?.id ?? ''}
        // Choosing a view is navigation: push, so Back returns to what was on screen before.
        onValueChange={(id) => {
          const view = items.find((v) => v.id === id);
          if (view) nav.push({ ...LIST_DEFAULTS, ...view.config, saved: view.id });
        }}
      />
      {modified ? <Badge tone="info">Modified</Badge> : null}
      <Menu align="start" trigger={<Button variant="ghost" size="sm" loading={updateView.isPending}>View options</Button>} items={menu} />

      <Dialog
        size="sm"
        title={dialog === 'rename' ? 'Rename view' : 'Save view'}
        description={dialog === 'rename' ? undefined : 'Saves the tab, search, filters, sort, columns and display you have now.'}
        open={dialog === 'save' || dialog === 'rename'}
        onOpenChange={(next) => (next ? undefined : close())}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => submitName()} loading={saveView.isPending || updateView.isPending}>
              {dialog === 'rename' ? 'Rename' : 'Save view'}
            </Button>
          </>
        }
      >
        <Stack as="form" gap="md" onSubmit={submitName}>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} error={nameError} autoComplete="off" />
        </Stack>
      </Dialog>

      <Dialog
        size="sm"
        title="Delete view?"
        description={active ? `“${active.name}” will be removed from your views. The records aren’t affected.` : undefined}
        open={dialog === 'delete' && active !== undefined}
        onOpenChange={(next) => (next || deleteView.isPending ? undefined : close())}
        footer={
          <>
            <Button variant="secondary" disabled={deleteView.isPending} onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteView.isPending} onClick={confirmDelete}>
              Delete view
            </Button>
          </>
        }
      />
    </Cluster>
  );
}
