import type { ReactElement, ReactNode } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Popover.css';

export interface PopoverProps extends EscapeHatch {
  /** Accessible name of the popover (it is a non-modal dialog): "Filter records". Required. */
  label: string;
  /** Element that opens it, typically a system Button. It gets aria-expanded and aria-controls. */
  trigger: ReactElement;
  /** A few controls that act on the page: filter checkboxes, a small form. */
  children: ReactNode;
  /** Edge of the trigger the popover lines up with. */
  align?: 'start' | 'end';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A small non-modal panel anchored to its trigger, for a few controls (a filter menu). Focus moves
 * in on open and back to the trigger on close; Escape and an outside click close it. From Radix Popover.
 */
export function Popover({ label, trigger, children, align = 'start', UNSAFE_className, UNSAFE_style, ...rootProps }: PopoverProps) {
  return (
    <PopoverPrimitive.Root {...rootProps}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className={cx('popover', UNSAFE_className)} style={UNSAFE_style} align={align} sideOffset={4} aria-label={label}>
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
