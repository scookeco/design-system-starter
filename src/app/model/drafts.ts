/**
 * Draft ownership. A form's draft is not server data, so it never lives in the query cache: the
 * form owns it (component state), and it keeps, beside the values, the record they started from
 * (the base, with its version). That base is what a save sends as If-Match and what a conflict is
 * compared against (src/app/model/conflicts.ts).
 *
 *   autosave   every change is written to localStorage under the workspace, the person and the
 *              record, so a reload, a crash or Back loses nothing; reopening the form restores it.
 *              Storage can be full, disabled or blocked: every access is guarded, and a draft that
 *              can't be stored is still a working draft
 *   clear      after a save, on Discard, and for everyone on sign-out (a draft is private)
 *   guard      while a draft is dirty, in-app navigation asks first (useNavigationGuard in
 *              src/app/url/useUrlState.tsx) and closing the tab gets the browser's own prompt
 */
import { useCallback, useEffect, useState } from 'react';
import type { RecordEntity } from '../api/schemas';
import { useSession } from '../session';
import { useTenant } from '../tenant';

const PREFIX = 'app-draft:';

export interface StoredDraft<T> {
  values: T;
  /** The record the draft started from (an edit), or none (a create). */
  base: RecordEntity | undefined;
  /** When it was last written (ms). */
  savedAt: number;
}

/** localStorage, guarded: private windows, full quotas and blocked storage all fail quietly. */
export const draftStorage = {
  read: <T>(key: string): StoredDraft<T> | undefined => {
    try {
      const raw = globalThis.localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as StoredDraft<T>) : undefined;
    } catch {
      return undefined;
    }
  },
  write: <T>(key: string, draft: StoredDraft<T>) => {
    try {
      globalThis.localStorage.setItem(PREFIX + key, JSON.stringify(draft));
    } catch {
      // Not stored: the draft still works, it just won't survive a reload.
    }
  },
  remove: (key: string) => {
    try {
      globalThis.localStorage.removeItem(PREFIX + key);
    } catch {
      // Nothing to do.
    }
  },
  /** Every draft on this device (sign-out; a fresh story or test). */
  clearAll: () => {
    try {
      const storage = globalThis.localStorage;
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k?.startsWith(PREFIX) ?? false);
      for (const key of keys) storage.removeItem(key);
    } catch {
      // Nothing to do.
    }
  },
};

export interface Draft<T> {
  values: T;
  base: RecordEntity | undefined;
  /** The values differ from where the draft started (the record, or an empty form). */
  dirty: boolean;
  /** Restored from storage when the form opened: when it was saved. */
  restoredAt: number | undefined;
  set: (update: (values: T) => T) => void;
  /** Start again from a record (after a save, Take theirs, or a quiet rebase): not dirty. */
  reset: (base: RecordEntity | undefined, values: T) => void;
  /** Throw the draft away, here and in storage, and go back to where it started. */
  discard: () => void;
}

/**
 * The draft for one form: `entity` names what it edits ("record:r-1001", "record:new"). `pristine`
 * gives the untouched values for a base; a draft equal to them isn't dirty and isn't stored.
 */
export function useDraft<T>(entity: string, start: { base: RecordEntity | undefined; values: T }, pristine: (base: RecordEntity | undefined) => T): Draft<T> {
  const tenant = useTenant();
  const user = useSession().user.id;
  const key = `${tenant}:${user}:${entity}`;
  const [state, setState] = useState(() => {
    const stored = draftStorage.read<T>(key);
    return stored ? { base: stored.base, values: stored.values, restoredAt: stored.savedAt as number | undefined } : { ...start, restoredAt: undefined };
  });
  const dirty = JSON.stringify(state.values) !== JSON.stringify(pristine(state.base));

  // Autosave: a dirty draft is written on every change; a clean one is removed.
  useEffect(() => {
    if (dirty) draftStorage.write(key, { values: state.values, base: state.base, savedAt: Date.now() });
    else draftStorage.remove(key);
  }, [key, dirty, state.values, state.base]);

  const set = useCallback((update: (values: T) => T) => setState((current) => ({ ...current, values: update(current.values) })), []);
  const reset = useCallback((base: RecordEntity | undefined, values: T) => setState({ base, values, restoredAt: undefined }), []);
  const discard = useCallback(() => {
    draftStorage.remove(key);
    setState((current) => ({ base: current.base, values: pristine(current.base), restoredAt: undefined }));
  }, [key, pristine]);

  return { values: state.values, base: state.base, dirty, restoredAt: state.restoredAt, set, reset, discard };
}

/** While `when`, closing or reloading the tab gets the browser's "Leave site?" prompt. */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);
}
