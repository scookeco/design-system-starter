import type { ReactElement, ReactNode } from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './HoverCard.css';

export interface HoverCardProps extends EscapeHatch {
  /**
   * A link (or other focusable element) that already leads to the full content. The card opens on
   * hover and on keyboard focus; it never opens on touch, so the trigger must work without it.
   */
  trigger: ReactElement;
  /** A preview of what the trigger leads to: a person's role, a record's status. Nothing interactive. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A supplementary preview of a link's destination, shown on hover and focus. Supplementary only:
 * screen readers and touch never get it, so everything in it must also be at the destination.
 * Behaviour from Radix HoverCard.
 */
export function HoverCard({ trigger, children, side = 'bottom', align = 'start', UNSAFE_className, UNSAFE_style, ...rootProps }: HoverCardProps) {
  return (
    <HoverCardPrimitive.Root openDelay={500} closeDelay={200} {...rootProps}>
      <HoverCardPrimitive.Trigger asChild>{trigger}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content className={cx('hover-card', UNSAFE_className)} style={UNSAFE_style} side={side} align={align} sideOffset={4}>
          {children}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
