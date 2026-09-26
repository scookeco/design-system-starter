// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ariaKeyShortcuts, findShortcutConflicts, formatShortcut, isReservedShortcut, Kbd, useShortcut } from '../../src/index';
import { createShortcutRegistry, type ShortcutRegistry } from '../../src/components/Shortcuts/registry';

afterEach(cleanup);

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

/** A registry on the document that records refusals instead of logging them. */
const makeRegistry = (platform: 'mac' | 'other' = 'other') => {
  const registry = createShortcutRegistry(document, platform);
  const refused: Parameters<ShortcutRegistry['onRefused']>[0][] = [];
  registry.onRefused = (report) => refused.push(report);
  return { registry, refused };
};

describe('shortcut notation', () => {
  it('shows mod as ⌘ on a Mac and Ctrl elsewhere', () => {
    expect(formatShortcut('mod+k', 'mac')).toBe('⌘K');
    expect(formatShortcut('mod+k', 'other')).toBe('Ctrl+K');
    expect(formatShortcut('mod+shift+p', 'mac')).toBe('⇧⌘P');
    expect(formatShortcut('g i', 'other')).toBe('G then I');
  });

  it('writes aria-keyshortcuts in ARIA syntax', () => {
    expect(ariaKeyShortcuts('mod+k', 'mac')).toBe('Meta+K');
    expect(ariaKeyShortcuts('mod+k', 'other')).toBe('Control+K');
    expect(ariaKeyShortcuts('g i', 'other')).toBe('G I');
  });

  it('gives symbols a spoken name', () => {
    render(<Kbd keys="mod+enter" platform="mac" />);
    expect(screen.getByText('Command')).toBeTruthy();
    expect(screen.getByText('Enter')).toBeTruthy();
  });
});

describe('conflict detection', () => {
  it('finds two shortcuts with the same keys, keeping the first', () => {
    expect(
      findShortcutConflicts(
        [
          { id: 'inbox.archive', keys: 'e' },
          { id: 'record.edit', keys: 'E' },
          { id: 'palette', keys: 'mod+k' },
        ],
        'other',
      ),
    ).toEqual([{ keys: 'E', kept: 'inbox.archive', refused: 'record.edit' }]);
  });

  it('resolves mod per platform: mod+k and ctrl+k collide outside a Mac only', () => {
    const shortcuts = [
      { id: 'palette', keys: 'mod+k' },
      { id: 'link', keys: 'ctrl+k' },
    ];
    expect(findShortcutConflicts(shortcuts, 'other')).toHaveLength(1);
    expect(findShortcutConflicts(shortcuts, 'mac')).toEqual([]);
  });

  it('treats a single key that starts a sequence as a conflict', () => {
    expect(findShortcutConflicts([{ id: 'go.inbox', keys: 'g i' }, { id: 'grid', keys: 'g' }], 'other')).toEqual([{ keys: 'g', kept: 'go.inbox', refused: 'grid' }]);
    expect(findShortcutConflicts([{ id: 'go.inbox', keys: 'g i' }, { id: 'go.home', keys: 'g h' }], 'other')).toEqual([]);
  });
});

describe('reserved keys', () => {
  it.each(['mod+c', 'mod+v', 'mod+f', 'mod+l', 'tab', 'escape', 'arrowdown', 'enter', 'space', 'alt+arrowleft', 'f6', 'ctrl+alt+h'])('refuses %s', (keys) => {
    expect(isReservedShortcut(keys, 'other')).toBe(true);
  });

  it('refuses VoiceOver’s Control+Option chords on a Mac', () => {
    expect(isReservedShortcut('ctrl+alt+a', 'mac')).toBe(true);
  });

  it.each(['mod+k', 'j', '?', 'g i', 'mod+shift+p'])('allows %s', (keys) => {
    expect(isReservedShortcut(keys, 'other')).toBe(false);
  });
});

describe('the registry', () => {
  it('fires a shortcut and prevents the key’s default', () => {
    const { registry } = makeRegistry();
    const handler = vi.fn();
    const off = registry.register({ id: 'palette', keys: 'mod+k', description: 'Open', handler });
    const event = press(document.body, 'k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    off();
    press(document.body, 'k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('refuses a conflicting registration: the first keeps the keys, the second never fires, the conflict is reported', () => {
    const { registry, refused } = makeRegistry();
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = registry.register({ id: 'inbox.archive', keys: 'e', description: 'Archive', handler: first });
    const offSecond = registry.register({ id: 'record.edit', keys: 'e', description: 'Edit', handler: second });
    press(document.body, 'e');
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    expect(refused).toEqual([{ id: 'record.edit', keys: 'e', reason: 'conflict', conflict: { keys: 'e', kept: 'inbox.archive', refused: 'record.edit' } }]);
    expect(registry.active().map((s) => s.id)).toEqual(['inbox.archive']);
    offFirst();
    offSecond();
  });

  it('refuses reserved keys and never prevents them', () => {
    const { registry, refused } = makeRegistry();
    const handler = vi.fn();
    const off = registry.register({ id: 'copy', keys: 'mod+c', description: 'Copy link', handler });
    const event = press(document.body, 'c', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(refused[0]?.reason).toBe('reserved');
    off();
  });

  it('stays out of text fields unless the shortcut allows it', () => {
    const { registry } = makeRegistry();
    const archive = vi.fn();
    const palette = vi.fn();
    const offs = [
      registry.register({ id: 'archive', keys: 'e', description: 'Archive', handler: archive }),
      registry.register({ id: 'palette', keys: 'mod+k', description: 'Open', handler: palette, allowInInputs: true }),
    ];
    const input = document.body.appendChild(document.createElement('input'));
    const typed = press(input, 'e');
    press(input, 'k', { ctrlKey: true });
    expect(archive).not.toHaveBeenCalled();
    expect(typed.defaultPrevented).toBe(false);
    expect(palette).toHaveBeenCalledOnce();
    input.remove();
    for (const off of offs) off();
  });

  it('stays out of dialogs, IME composition and keys another handler took', () => {
    const { registry } = makeRegistry();
    const handler = vi.fn();
    const off = registry.register({ id: 'archive', keys: 'e', description: 'Archive', handler });
    const dialog = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    const button = dialog.appendChild(document.createElement('button'));
    press(button, 'e');
    press(document.body, 'e', { isComposing: true });
    const taken = new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true });
    taken.preventDefault();
    document.body.dispatchEvent(taken);
    expect(handler).not.toHaveBeenCalled();
    dialog.remove();
    off();
  });

  it('turns single-key shortcuts off (WCAG 2.2 SC 2.1.4) and leaves chords on', () => {
    const { registry } = makeRegistry();
    const single = vi.fn();
    const chord = vi.fn();
    const offs = [
      registry.register({ id: 'archive', keys: 'e', description: 'Archive', handler: single }),
      registry.register({ id: 'palette', keys: 'mod+k', description: 'Open', handler: chord }),
    ];
    registry.setCharacterKeys(false);
    press(document.body, 'e');
    press(document.body, 'k', { ctrlKey: true });
    expect(single).not.toHaveBeenCalled();
    expect(chord).toHaveBeenCalledOnce();
    registry.setCharacterKeys(true);
    for (const off of offs) off();
  });

  it('runs a two-key sequence', () => {
    const { registry } = makeRegistry();
    const handler = vi.fn();
    const off = registry.register({ id: 'go.inbox', keys: 'g i', description: 'Go to Inbox', handler });
    press(document.body, 'g');
    press(document.body, 'i');
    expect(handler).toHaveBeenCalledOnce();
    press(document.body, 'i');
    expect(handler).toHaveBeenCalledOnce();
    off();
  });

  it('matches "?" whatever Shift says', () => {
    const { registry } = makeRegistry();
    const handler = vi.fn();
    const off = registry.register({ id: 'help', keys: '?', description: 'Help', handler });
    press(document.body, '?', { shiftKey: true });
    expect(handler).toHaveBeenCalledOnce();
    off();
  });
});

describe('useShortcut', () => {
  function Archive({ onArchive }: { onArchive: () => void }) {
    useShortcut({ id: 'test.archive', keys: 'e', description: 'Archive', handler: onArchive });
    return <p>page</p>;
  }

  it('registers while mounted and calls the latest handler', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender, unmount } = render(<Archive onArchive={first} />);
    rerender(<Archive onArchive={latest} />);
    act(() => void press(document.body, 'e'));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
    unmount();
    act(() => void press(document.body, 'e'));
    expect(latest).toHaveBeenCalledOnce();
  });
});
