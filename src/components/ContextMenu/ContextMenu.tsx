import type { ReactElement } from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { ariaKeyShortcuts } from '../Kbd/Kbd';
import { MenuItemContent, type MenuEntry } from '../Menu/Menu';
import './ContextMenu.css';

export interface ContextMenuProps extends EscapeHatch {
  /**
   * The region it belongs to: one focusable element (a row, a card). Right-click, a long press,
   * Shift+F10 or the Menu key on it opens the menu.
   */
  children: ReactElement;
  /** The same entries as Menu: items (with an optional shortcut) and 'separator'. */
  items: readonly MenuEntry[];
  /** Optional non-interactive heading (what the menu acts on). */
  label?: string;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Actions on a thing, where the pointer or focus is: right-click (or Shift+F10 on the focused
 * element). A shortcut to actions that are also visible somewhere (a ⋯ Menu, a toolbar): nobody
 * discovers a context menu, so it must never be the only way. Items look and read like Menu's.
 * Behaviour from Radix ContextMenu.
 */
export function ContextMenu({ children, items, label, onOpenChange, UNSAFE_className, UNSAFE_style }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root {...(onOpenChange ? { onOpenChange } : {})}>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className={cx('menu', 'context-menu', UNSAFE_className)} style={UNSAFE_style}>
          {label ? <ContextMenuPrimitive.Label className="menu__label">{label}</ContextMenuPrimitive.Label> : null}
          {label ? <ContextMenuPrimitive.Separator className="menu__separator" /> : null}
          {items.map((entry, index) =>
            entry === 'separator' ? (
              <ContextMenuPrimitive.Separator className="menu__separator" key={`separator-${String(index)}`} />
            ) : (
              <ContextMenuPrimitive.Item
                key={entry.label}
                className="menu__item"
                data-tone={entry.tone ?? 'default'}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
                {...(entry.shortcut ? { 'aria-keyshortcuts': ariaKeyShortcuts(entry.shortcut) } : {})}
              >
                <MenuItemContent item={entry} />
              </ContextMenuPrimitive.Item>
            ),
          )}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
