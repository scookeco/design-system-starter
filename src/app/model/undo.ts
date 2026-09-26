/**
 * Undo instead of "Are you sure?", for what can really be undone (archive, a status move, removing
 * a tag). Two ways to make Undo real, both used here:
 *
 *   hold, then commit   the write waits in its record's queue for the undo window (the preview shows
 *                       it at once); Undo inside the window drops it before anything is sent
 *                       (archive, remove a tag). If the tab closes inside the window, it's never sent
 *   commit, compensate  the write goes at once; Undo sends the inverse (move back). Nothing is lost
 *                       if the tab closes, but others may briefly see the change
 *
 * Undo after the window has closed compensates too, so the toast's own timer (which pauses while
 * it's hovered or focused) and this one can drift apart harmlessly. Irreversible actions (delete,
 * bulk delete) still confirm first: a toast can't undo them.
 */
import { WriteCancelled } from './writeQueue';

/** How long Undo holds a write back. Stories hold it open (Infinity); tests shorten it. */
export const undoSettings = { windowMs: 6_000 };

export interface UndoWindow {
  /** Resolves when the window closes (the held write may go); rejects with WriteCancelled on Undo. */
  closed: Promise<void>;
  /** Undo inside the window: true if the held write was dropped; false once it has closed (compensate instead). */
  cancel: () => boolean;
  /** How long it stays open, for the toast's duration. */
  ms: number;
}

export function openUndoWindow(ms = undoSettings.windowMs): UndoWindow {
  let open = true;
  let release: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const closed = new Promise<void>((resolve, fail) => {
    release = resolve;
    reject = fail;
  });
  closed.catch(() => undefined);
  // An infinite window never closes on its own (setTimeout would fire at once for Infinity).
  const timer = Number.isFinite(ms)
    ? setTimeout(() => {
        open = false;
        release();
      }, ms)
    : undefined;
  return {
    closed,
    ms,
    cancel: () => {
      if (!open) return false;
      open = false;
      clearTimeout(timer);
      reject(new WriteCancelled());
      return true;
    },
  };
}
