import type { ReactElement } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { ariaKeyShortcuts, Kbd } from '../Kbd/Kbd';
import './Tooltip.css';

export interface TooltipProps extends EscapeHatch {
  /** Supplemental text. Never the only place essential information lives. */
  content: string;
  /** A focusable element, typically a system Button. It keeps its own accessible name. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The keyboard shortcut for the control, shown after the text ("Archive  E") and set as the
   * control's aria-keyshortcuts. It only shows the keys: register them with useShortcut.
   */
  shortcut?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Tooltip on hover and focus, dismissed with Escape. Behaviour from Radix Tooltip. */
export function Tooltip({ content, children, side = 'top', shortcut, UNSAFE_className, UNSAFE_style, ...rootProps }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root {...rootProps}>
        <TooltipPrimitive.Trigger asChild {...(shortcut ? { 'aria-keyshortcuts': ariaKeyShortcuts(shortcut) } : {})}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className={cx('tooltip', UNSAFE_className)} style={UNSAFE_style} side={side} sideOffset={6}>
            {shortcut ? (
              <span className="tooltip__with-shortcut">
                {content}
                <Kbd keys={shortcut} />
              </span>
            ) : (
              content
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
