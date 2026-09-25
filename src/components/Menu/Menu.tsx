import type { ReactElement } from 'react';
import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Menu.css';

export interface MenuItem {
  /** Verb-first label ("Duplicate record"). Required. */
  label: string;
  onSelect?: () => void;
  /** Decorative leading icon. */
  icon?: IconName;
  /** danger marks a destructive item. Keep it last, after a separator. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

/** An item, or 'separator' for a divider between groups. */
export type MenuEntry = MenuItem | 'separator';

export interface MenuProps extends EscapeHatch {
  /** Element that opens the menu, typically a system Button. It keeps its own accessible name. */
  trigger: ReactElement;
  items: readonly MenuEntry[];
  /** Optional non-interactive heading at the top (the signed-in user in an account menu). */
  label?: string;
  /** Edge of the trigger the menu lines up with. */
  align?: 'start' | 'end';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Action menu. Keyboard, typeahead, focus return and ARIA come from Radix DropdownMenu. */
export function Menu({ trigger, items, label, align = 'start', UNSAFE_className, UNSAFE_style, ...rootProps }: MenuProps) {
  return (
    <MenuPrimitive.Root {...rootProps}>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content className={cx('menu', UNSAFE_className)} style={UNSAFE_style} align={align} sideOffset={4}>
          {label ? <MenuPrimitive.Label className="menu__label">{label}</MenuPrimitive.Label> : null}
          {label ? <MenuPrimitive.Separator className="menu__separator" /> : null}
          {items.map((entry, index) =>
            entry === 'separator' ? (
              <MenuPrimitive.Separator className="menu__separator" key={`separator-${String(index)}`} />
            ) : (
              <MenuPrimitive.Item
                key={entry.label}
                className="menu__item"
                data-tone={entry.tone ?? 'default'}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
              >
                {entry.icon ? <Icon name={entry.icon} /> : null}
                <span className="menu__item-label">{entry.label}</span>
              </MenuPrimitive.Item>
            ),
          )}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
