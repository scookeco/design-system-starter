import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Kbd.css';

/**
 * Where a shortcut is shown: Apple keyboards name modifiers with symbols (⌘ ⇧ ⌥ ⌃), everyone
 * else with words (Ctrl, Shift, Alt). `mod` is the platform's command key: ⌘ on a Mac, Ctrl elsewhere.
 */
export type KeyPlatform = 'mac' | 'other';

/**
 * The platform this browser runs on. Anything without a browser window gets "other": server
 * rendering and generated docs must not depend on the machine they run on (Node 21+ has a global
 * navigator whose platform is the host OS).
 */
export const detectPlatform = (): KeyPlatform => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'other';
  const agent = navigator as Navigator & { userAgentData?: { platform?: string } };
  const name = agent.userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad/i.test(name) ? 'mac' : 'other';
};

type Modifier = 'mod' | 'ctrl' | 'alt' | 'shift';

/** One key press: its modifiers and the key itself, lower-cased ("k", "?", "enter", "arrowdown"). */
export interface KeyStroke {
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

/**
 * Parse shortcut notation: modifiers joined with "+", strokes of a sequence separated by a space.
 * "mod+k" → one stroke; "g i" → two (press g, then i); "?" → one. Unknown parts are kept as keys.
 */
export const parseShortcut = (keys: string): KeyStroke[] =>
  keys
    .trim()
    .split(/\s+/)
    .map((stroke) => {
      // "+" on its own is a key ("mod++" zooms in), so split on a "+" that follows a character.
      const parts = stroke.toLowerCase().split(/(?<=.)\+/);
      const key = parts.at(-1) ?? '';
      const has = (m: Modifier) => parts.slice(0, -1).includes(m);
      return { mod: has('mod'), ctrl: has('ctrl'), alt: has('alt'), shift: has('shift'), key };
    });

/** Canonical form of a shortcut on one platform, for comparing two of them ("mod" resolved). */
export const canonicalShortcut = (keys: string, platform: KeyPlatform): string =>
  parseShortcut(keys)
    .map((s) => {
      const meta = s.mod && platform === 'mac';
      const ctrl = s.ctrl || (s.mod && platform !== 'mac');
      return [meta && 'meta', ctrl && 'ctrl', s.alt && 'alt', s.shift && 'shift', s.key].filter(Boolean).join('+');
    })
    .join(' ');

const NAMED: Record<string, string> = {
  enter: '↵',
  escape: 'Esc',
  esc: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: '⌫',
  delete: 'Del',
  space: 'Space',
  tab: 'Tab',
};
const SPOKEN: Record<string, string> = { '↵': 'Enter', '↑': 'Up arrow', '↓': 'Down arrow', '←': 'Left arrow', '→': 'Right arrow', '⌫': 'Backspace' };

/** One key as shown, and as spoken where the symbol alone is unclear to a screen reader. */
interface KeyCap {
  shown: string;
  spoken?: string;
}

const MAC_MODIFIERS: Record<Modifier, KeyCap> = {
  ctrl: { shown: '⌃', spoken: 'Control' },
  alt: { shown: '⌥', spoken: 'Option' },
  shift: { shown: '⇧', spoken: 'Shift' },
  mod: { shown: '⌘', spoken: 'Command' },
};
const OTHER_MODIFIERS: Record<Modifier, KeyCap> = { mod: { shown: 'Ctrl' }, ctrl: { shown: 'Ctrl' }, alt: { shown: 'Alt' }, shift: { shown: 'Shift' } };

const keyCap = (key: string): KeyCap => {
  const shown = NAMED[key] ?? (key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1));
  const spoken = SPOKEN[shown];
  return spoken ? { shown, spoken } : { shown };
};

/** The key caps of each stroke, in the platform's order (⌃ ⌥ ⇧ ⌘ on a Mac; Ctrl Alt Shift elsewhere). */
const strokeCaps = (stroke: KeyStroke, platform: KeyPlatform): KeyCap[] => {
  const names = platform === 'mac' ? MAC_MODIFIERS : OTHER_MODIFIERS;
  const order: Modifier[] = platform === 'mac' ? ['ctrl', 'alt', 'shift', 'mod'] : ['mod', 'ctrl', 'alt', 'shift'];
  const modifiers = order.filter((m) => stroke[m]).map((m) => names[m]);
  // mod and ctrl are the same key outside a Mac: show it once.
  const unique = modifiers.filter((cap, i) => modifiers.findIndex((c) => c.shown === cap.shown) === i);
  return [...unique, keyCap(stroke.key)];
};

/**
 * A shortcut as plain text for the platform: "⌘K", "Ctrl+K", "G then I". For places that take a
 * string (a Tooltip's content, a palette row's label); render <Kbd> where markup is allowed.
 */
export const formatShortcut = (keys: string, platform: KeyPlatform = detectPlatform()): string =>
  parseShortcut(keys)
    .map((stroke) => strokeCaps(stroke, platform).map((c) => c.shown).join(platform === 'mac' ? '' : '+'))
    .join(' then ');

const ARIA_NAMES: Record<string, string> = { mod: '', ctrl: 'Control', alt: 'Alt', shift: 'Shift', escape: 'Escape', esc: 'Escape', enter: 'Enter', space: 'Space' };

/**
 * The shortcut in aria-keyshortcuts syntax ("Meta+K", "Control+K", "G I"), for the control it
 * triggers. Screen readers announce it with the control's name.
 */
export const ariaKeyShortcuts = (keys: string, platform: KeyPlatform = detectPlatform()): string =>
  parseShortcut(keys)
    .map((s) => {
      const parts = [s.mod && (platform === 'mac' ? 'Meta' : 'Control'), s.ctrl && 'Control', s.alt && 'Alt', s.shift && 'Shift'].filter(
        (p, i, all): p is string => Boolean(p) && all.indexOf(p) === i,
      );
      const key = ARIA_NAMES[s.key] ?? (s.key.length === 1 ? s.key.toUpperCase() : s.key.charAt(0).toUpperCase() + s.key.slice(1));
      return [...parts, key].join('+');
    })
    .join(' ');

interface KbdBase extends EscapeHatch {
  /** Override the detected platform (gallery and tests). */
  platform?: KeyPlatform;
  /** Word between the strokes of a sequence ("g i" → G then I). */
  thenLabel?: string;
}

export type KbdProps = KbdBase &
  (
    | {
        /** Shortcut notation: "mod+k", "shift+?", "g i" (a sequence), "j". `mod` is ⌘ on a Mac and Ctrl elsewhere. */
        keys: string;
        children?: never;
      }
    | {
        /**
         * One key, named as printed on it: "Tab", "Esc", "Enter". For a hint in running text
         * ("Tab to accept"); prefer `keys`, which also knows the platform, for a shortcut.
         */
        children: string;
        keys?: never;
      }
  );

/**
 * A key or a keyboard shortcut, shown as key caps: in hints ("Tab to accept"), tooltips, menus,
 * the command palette and the shortcuts overlay. `keys` takes shortcut notation and renders it
 * for the platform (⌘K on a Mac, Ctrl K elsewhere); `children` names one key as printed.
 * Symbols a screen reader would read badly (⌘, ↵) carry a spoken name. It only shows keys;
 * register a shortcut with useShortcut.
 */
export function Kbd({ keys, children, platform, thenLabel = 'then', UNSAFE_className, UNSAFE_style }: KbdProps) {
  const resolved = platform ?? detectPlatform();
  const strokes: KeyCap[][] = keys === undefined ? [[{ shown: children ?? '' }]] : parseShortcut(keys).map((stroke) => strokeCaps(stroke, resolved));
  return (
    <kbd className={cx('kbd', UNSAFE_className)} style={UNSAFE_style}>
      {strokes.map((caps, i) => (
        <span className="kbd__stroke" key={`${String(i)}-${caps.map((c) => c.shown).join('')}`}>
          {i > 0 ? <span className="kbd__then">{thenLabel}</span> : null}
          {caps.map((cap) => (
            <kbd className="kbd__key" key={cap.shown}>
              {cap.spoken ? (
                <>
                  <span aria-hidden="true">{cap.shown}</span>
                  <span className="visually-hidden">{cap.spoken}</span>
                </>
              ) : (
                cap.shown
              )}
            </kbd>
          ))}
        </span>
      ))}
    </kbd>
  );
}
