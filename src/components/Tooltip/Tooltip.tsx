import type { ReactElement } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Tooltip.css';

export interface TooltipProps extends EscapeHatch {
  /** Supplemental text. Never the only place essential information lives. */
  content: string;
  /** A focusable element, typically a system Button. It keeps its own accessible name. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Tooltip on hover and focus, dismissed with Escape. Behaviour from Radix Tooltip. */
export function Tooltip({ content, children, side = 'top', UNSAFE_className, UNSAFE_style, ...rootProps }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root {...rootProps}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className={cx('tooltip', UNSAFE_className)} style={UNSAFE_style} side={side} sideOffset={6}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
