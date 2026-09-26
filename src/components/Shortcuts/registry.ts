/**
 * The keyboard shortcut registry: one keydown listener for the whole document, and every active
 * shortcut in one list, so the help overlay, the command palette, tooltips and menus all show the
 * same keys and two features can't silently fight over one.
 *
 * Rules it enforces (the Keyboard and power users guide explains them):
 *   reserved      browser and screen-reader essentials (copy, paste, find, Tab, Escape, arrows,
 *                 Control+Option/Alt chords…) are refused: never registered, never prevented
 *   conflicts     two active shortcuts with the same keys on this platform: the first keeps them,
 *                 the second never fires, and the conflict is reported
 *   text entry    nothing fires while typing in a field unless it says `allowInInputs`
 *   modals        nothing fires from inside a dialog unless it says `allowInDialogs`
 *   single keys   shortcuts without Ctrl, Alt or ⌘ (j, e, ?) can be turned off (WCAG 2.2 SC 2.1.4)
 *   composition   an IME composition, or an event something else already handled, is left alone
 */
import { canonicalShortcut, detectPlatform, parseShortcut, type KeyPlatform, type KeyStroke } from '../Kbd/Kbd';

export interface ShortcutDefinition {
  /** Stable id ("inbox.archive"). Used in conflict reports and as the React key in lists. */
  id: string;
  /** Shortcut notation: "mod+k", "shift+?", "g i", "e". `mod` is ⌘ on a Mac and Ctrl elsewhere. */
  keys: string;
  /** What it does, verb first ("Archive conversation"). Shown in the help overlay and the palette. */
  description: string;
  /** Group in the help overlay ("Global", "Inbox"). Default "Global". */
  scope?: string;
  handler: (event: KeyboardEvent) => void;
  /** Also fire while focus is in a text field. Only for chords with ⌘/Ctrl (mod+k), never a bare letter. */
  allowInInputs?: boolean;
  /** Also fire while focus is inside a dialog. Page shortcuts never should. */
  allowInDialogs?: boolean;
  /** Register it but don't fire it (a page state where the action makes no sense). Default true. */
  enabled?: boolean;
}

/** A registered shortcut, as the help overlay and the palette read it. */
export interface ActiveShortcut {
  id: string;
  keys: string;
  description: string;
  scope: string;
  /** A single key without ⌘, Ctrl or Alt: turned off with the character-key setting. */
  characterKey: boolean;
}

export interface ShortcutConflict {
  keys: string;
  /** The id that keeps the keys (registered first) and the one that was refused. */
  kept: string;
  refused: string;
}

/**
 * Keys the registry never takes. They belong to the browser (copy, paste, find, tabs, zoom,
 * history), to moving and activating focus (Tab, Enter, Space, arrows, Home/End, Page Up/Down,
 * Escape, which dialogs and menus own), or to screen readers (anything with Control+Option on a
 * Mac, or Control+Alt elsewhere; F-keys).
 */
export const RESERVED_SHORTCUTS: readonly string[] = [
  'mod+a', 'mod+c', 'mod+v', 'mod+x', 'mod+z', 'mod+shift+z', 'mod+y', 'mod+f', 'mod+g', 'mod+shift+g', 'mod+l', 'mod+t', 'mod+shift+t', 'mod+w',
  'mod+n', 'mod+shift+n', 'mod+r', 'mod+shift+r', 'mod+p', 'mod+q', 'mod+h', 'mod+m', 'mod+d', 'mod+=', 'mod++', 'mod+-', 'mod+0', 'mod+[', 'mod+]',
  'alt+arrowleft', 'alt+arrowright', 'tab', 'shift+tab', 'enter', 'space', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'home', 'end', 'pageup', 'pagedown', 'backspace', 'delete',
];

/** Modifier chords screen readers own on every platform: Control+Option (VoiceOver) and Control+Alt. */
const isScreenReaderChord = (stroke: KeyStroke) => stroke.ctrl && stroke.alt;
const isFunctionKey = (stroke: KeyStroke) => /^f\d{1,2}$/.test(stroke.key);

/** Whether a shortcut would take a key the browser or assistive technology needs. */
export const isReservedShortcut = (keys: string, platform: KeyPlatform = detectPlatform()): boolean => {
  const canonical = canonicalShortcut(keys, platform);
  const strokes = parseShortcut(keys);
  return (
    RESERVED_SHORTCUTS.some((reserved) => canonicalShortcut(reserved, platform) === canonical) ||
    strokes.some((s) => isScreenReaderChord(s) || isFunctionKey(s) || (platform === 'mac' && s.mod && s.ctrl))
  );
};

/** A single key without ⌘, Ctrl or Alt (Shift is fine: "?" is Shift+/): WCAG 2.2 SC 2.1.4 applies. */
export const isCharacterKey = (keys: string) => parseShortcut(keys).every((s) => !s.mod && !s.ctrl && !s.alt);

/**
 * Every pair of shortcuts that would claim the same keys on this platform, earliest first. Pure:
 * the registry calls it on every registration, and a test runs it over a whole app's shortcuts.
 * A sequence and a single key that starts it ("g i" and "g") conflict too: the single key would
 * always fire first.
 */
export const findShortcutConflicts = (shortcuts: readonly Pick<ShortcutDefinition, 'id' | 'keys'>[], platform: KeyPlatform = detectPlatform()): ShortcutConflict[] => {
  const conflicts: ShortcutConflict[] = [];
  shortcuts.forEach((later, i) => {
    const mine = canonicalShortcut(later.keys, platform).split(' ');
    const earlier = shortcuts.slice(0, i).find((other) => {
      const theirs = canonicalShortcut(other.keys, platform).split(' ');
      const shorter = mine.length <= theirs.length ? mine : theirs;
      const longer = shorter === mine ? theirs : mine;
      return shorter.every((stroke, n) => stroke === longer[n]);
    });
    if (earlier) conflicts.push({ keys: later.keys, kept: earlier.id, refused: later.id });
  });
  return conflicts;
};

interface Entry {
  token: symbol;
  shortcut: ShortcutDefinition;
  /** Refused: reserved, or a conflict with an earlier shortcut. It never fires. */
  refused: boolean;
}

const SEQUENCE_TIMEOUT_MS = 1000;
const CHARACTER_KEYS_STORAGE = 'shortcuts.character-keys';

const readCharacterKeys = () => {
  try {
    return globalThis.localStorage?.getItem(CHARACTER_KEYS_STORAGE) !== 'off';
  } catch {
    return true;
  }
};

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'time', 'week']);

/** Typing somewhere: a text field, a textarea, a select, an editable region or a combobox/spinbutton input. */
const isTextEntry = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type);
  return ['textbox', 'combobox', 'searchbox', 'spinbutton'].includes(target.getAttribute('role') ?? '');
};

const inDialog = (target: EventTarget | null) => target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]') !== null;

/** Does this keydown press this stroke? Letters compare by key (layout-aware); Shift is implied by "?"-style keys. */
const pressed = (event: KeyboardEvent, stroke: KeyStroke, platform: KeyPlatform) => {
  const meta = stroke.mod && platform === 'mac';
  const ctrl = stroke.ctrl || (stroke.mod && platform !== 'mac');
  const key = event.key.toLowerCase();
  const printableSymbol = stroke.key.length === 1 && !/[a-z0-9]/.test(stroke.key);
  // Alt changes the character on a Mac (Option+k is "˚"): fall back to the physical key for letters.
  const sameKey = key === stroke.key || (key === ' ' && stroke.key === 'space') || (event.altKey && event.code === `Key${stroke.key.toUpperCase()}`);
  return (
    sameKey &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === stroke.alt &&
    (printableSymbol || event.shiftKey === stroke.shift)
  );
};

export interface ShortcutRegistry {
  /** Register while mounted; call the returned function to unregister. */
  register: (shortcut: ShortcutDefinition) => () => void;
  subscribe: (listener: () => void) => () => void;
  /** Every shortcut that can fire, in registration order. A new array only when something changed. */
  active: () => readonly ActiveShortcut[];
  characterKeys: () => boolean;
  setCharacterKeys: (on: boolean) => void;
  /** Called on a refused registration. Defaults to console.error: a conflict is a bug to fix. */
  onRefused: (report: { id: string; keys: string; reason: 'reserved' | 'conflict'; conflict?: ShortcutConflict }) => void;
}

/** A registry with its own listener on `target`. The app uses the document's one; tests make their own. */
export const createShortcutRegistry = (target: Pick<Document, 'addEventListener' | 'removeEventListener'> | null = globalThis.document ?? null, platform: KeyPlatform = detectPlatform()): ShortcutRegistry => {
  const entries: Entry[] = [];
  const listeners = new Set<() => void>();
  let snapshot: readonly ActiveShortcut[] = [];
  let characterKeys = readCharacterKeys();
  let pending: { strokes: number; entries: Entry[]; timer: ReturnType<typeof setTimeout> } | undefined;

  const notify = () => {
    snapshot = entries
      .filter((e) => !e.refused)
      .map(({ shortcut }) => ({
        id: shortcut.id,
        keys: shortcut.keys,
        description: shortcut.description,
        scope: shortcut.scope ?? 'Global',
        characterKey: isCharacterKey(shortcut.keys),
      }));
    for (const listener of listeners) listener();
  };

  const canFire = (entry: Entry, event: KeyboardEvent) => {
    const { shortcut } = entry;
    if (entry.refused || shortcut.enabled === false) return false;
    if (!characterKeys && isCharacterKey(shortcut.keys)) return false;
    if (isTextEntry(event.target) && !shortcut.allowInInputs) return false;
    if (inDialog(event.target) && !shortcut.allowInDialogs) return false;
    return true;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.key === 'Process' || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    // The second (or later) stroke of a sequence in progress.
    if (pending) {
      const step = pending.strokes;
      const matches = pending.entries.filter((e) => {
        const strokes = parseShortcut(e.shortcut.keys);
        const stroke = strokes[step];
        return stroke !== undefined && pressed(event, stroke, platform);
      });
      clearTimeout(pending.timer);
      pending = undefined;
      const done = matches.find((e) => parseShortcut(e.shortcut.keys).length === step + 1);
      if (done) {
        event.preventDefault();
        done.shortcut.handler(event);
        return;
      }
      if (matches.length > 0) {
        event.preventDefault();
        pending = { strokes: step + 1, entries: matches, timer: setTimeout(() => (pending = undefined), SEQUENCE_TIMEOUT_MS) };
        return;
      }
    }
    const candidates = entries.filter((e) => canFire(e, event) && pressed(event, parseShortcut(e.shortcut.keys)[0] as KeyStroke, platform));
    const single = candidates.find((e) => parseShortcut(e.shortcut.keys).length === 1);
    if (single) {
      event.preventDefault();
      single.shortcut.handler(event);
      return;
    }
    if (candidates.length > 0) {
      event.preventDefault();
      pending = { strokes: 1, entries: candidates, timer: setTimeout(() => (pending = undefined), SEQUENCE_TIMEOUT_MS) };
    }
  };

  const registry: ShortcutRegistry = {
    register: (shortcut) => {
      const token = Symbol(shortcut.id);
      let refused = false;
      if (isReservedShortcut(shortcut.keys, platform)) {
        refused = true;
        registry.onRefused({ id: shortcut.id, keys: shortcut.keys, reason: 'reserved' });
      } else {
        const live = entries.filter((e) => !e.refused).map((e) => e.shortcut);
        const conflict = findShortcutConflicts([...live, shortcut], platform).find((c) => c.refused === shortcut.id);
        if (conflict) {
          refused = true;
          registry.onRefused({ id: shortcut.id, keys: shortcut.keys, reason: 'conflict', conflict });
        }
      }
      if (entries.length === 0) target?.addEventListener('keydown', onKeyDown as EventListener);
      entries.push({ token, shortcut, refused });
      notify();
      return () => {
        const index = entries.findIndex((e) => e.token === token);
        if (index === -1) return;
        entries.splice(index, 1);
        if (entries.length === 0) {
          target?.removeEventListener('keydown', onKeyDown as EventListener);
          if (pending) clearTimeout(pending.timer);
          pending = undefined;
        }
        notify();
      };
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    active: () => snapshot,
    characterKeys: () => characterKeys,
    setCharacterKeys: (on) => {
      characterKeys = on;
      try {
        globalThis.localStorage?.setItem(CHARACTER_KEYS_STORAGE, on ? 'on' : 'off');
      } catch {
        // Not remembered this time; the setting still applies until reload.
      }
      notify();
    },
    onRefused: ({ id, keys, reason, conflict }) => {
      console.error(
        reason === 'reserved'
          ? `Shortcut "${id}" (${keys}) was refused: those keys belong to the browser or assistive technology.`
          : `Shortcut "${id}" (${keys}) was refused: "${conflict?.kept ?? ''}" already uses those keys.`,
      );
    },
  };
  return registry;
};

let documentRegistry: ReturnType<typeof createShortcutRegistry> | undefined;

/** The document's registry, made on first use (not at import: importing the library has no side effects). */
export const shortcutRegistry = () => (documentRegistry ??= createShortcutRegistry());
