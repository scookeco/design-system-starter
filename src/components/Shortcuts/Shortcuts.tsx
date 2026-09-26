import { useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import type { EscapeHatch } from '../../internal/closed-api';
import { Dialog } from '../Dialog/Dialog';
import { Kbd, type KeyPlatform } from '../Kbd/Kbd';
import { Switch } from '../Switch/Switch';
import { shortcutRegistry, type ActiveShortcut, type ShortcutDefinition } from './registry';
import './Shortcuts.css';

export type { ActiveShortcut, ShortcutConflict, ShortcutDefinition } from './registry';
export { findShortcutConflicts, isReservedShortcut, RESERVED_SHORTCUTS } from './registry';

/**
 * Register a keyboard shortcut while the component is mounted. The handler may change on every
 * render; the keys, id, description, scope and options re-register it. A reserved or conflicting
 * shortcut is refused and reported (see the Keyboard and power users guide), never silently
 * doubled up.
 *
 *   useShortcut({ id: 'inbox.archive', keys: 'e', description: 'Archive', scope: 'Inbox', handler: archive });
 */
export function useShortcut(shortcut: ShortcutDefinition): void {
  const handler = useRef(shortcut.handler);
  useEffect(() => {
    handler.current = shortcut.handler;
  });
  const { id, keys, description, scope, allowInInputs, allowInDialogs, enabled } = shortcut;
  useEffect(
    () =>
      shortcutRegistry().register({
        id,
        keys,
        description,
        ...(scope === undefined ? {} : { scope }),
        ...(allowInInputs === undefined ? {} : { allowInInputs }),
        ...(allowInDialogs === undefined ? {} : { allowInDialogs }),
        ...(enabled === undefined ? {} : { enabled }),
        handler: (event) => handler.current(event),
      }),
    [id, keys, description, scope, allowInInputs, allowInDialogs, enabled],
  );
}

/** Every shortcut that can fire right now, in registration order: for a help overlay or a palette. */
export function useActiveShortcuts(): readonly ActiveShortcut[] {
  const registry = shortcutRegistry();
  return useSyncExternalStore(registry.subscribe, registry.active, registry.active);
}

/** Whether single-key shortcuts (j, e, ?) are on, and the switch that turns them off (WCAG 2.2 SC 2.1.4). */
export function useCharacterKeyShortcuts(): [boolean, (on: boolean) => void] {
  const registry = shortcutRegistry();
  const on = useSyncExternalStore(registry.subscribe, registry.characterKeys, registry.characterKeys);
  return [on, registry.setCharacterKeys];
}

export interface ShortcutHelpProps extends EscapeHatch {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional element that opens it (a Help menu item opens it with `open` instead). */
  trigger?: ReactElement;
  title?: string;
  /** Keys that open it. Default "?" (Shift+/). */
  keys?: string;
  /** Override the detected platform (gallery and tests). */
  platform?: KeyPlatform;
}

/**
 * The shortcuts overlay: every active shortcut, grouped by scope, with its keys. Mount it once in
 * the app's shell composition; it registers its own key (?) and lists whatever else is registered
 * while it's open, so a page's shortcuts appear on that page only. It also holds the switch that
 * turns single-key shortcuts off.
 */
export function ShortcutHelp({ open, defaultOpen = false, onOpenChange, trigger, title = 'Keyboard shortcuts', keys = '?', platform, UNSAFE_className, UNSAFE_style }: ShortcutHelpProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const isOpen = open ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  useShortcut({ id: 'shortcuts.help', keys, description: 'Show keyboard shortcuts', handler: () => setOpen(true) });
  const shortcuts = useActiveShortcuts();
  const [characterKeys, setCharacterKeys] = useCharacterKeyShortcuts();
  const scopes = [...new Set(shortcuts.map((s) => s.scope))];

  return (
    <Dialog
      title={title}
      open={isOpen}
      onOpenChange={setOpen}
      size="md"
      {...(trigger ? { trigger } : {})}
      {...(UNSAFE_className ? { UNSAFE_className } : {})}
      {...(UNSAFE_style ? { UNSAFE_style } : {})}
    >
      <Switch
        label="Single-key shortcuts"
        description="Shortcuts without ⌘, Ctrl or Alt, such as J or E. Turn them off if they get in the way of speech input or a screen reader."
        checked={characterKeys}
        onCheckedChange={setCharacterKeys}
      />
      {scopes.map((scope) => (
        <section className="shortcut-help__scope" key={scope} aria-label={scope}>
          <h3 className="shortcut-help__heading">{scope}</h3>
          <dl className="shortcut-help__list">
            {shortcuts
              .filter((s) => s.scope === scope)
              .map((s) => (
                <div className="shortcut-help__row" key={s.id} data-off={s.characterKey && !characterKeys ? 'true' : undefined}>
                  <dt className="shortcut-help__description">{s.description}</dt>
                  <dd className="shortcut-help__keys">
                    <Kbd keys={s.keys} {...(platform ? { platform } : {})} />
                    {s.characterKey && !characterKeys ? <span className="shortcut-help__off">Off</span> : null}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </Dialog>
  );
}
