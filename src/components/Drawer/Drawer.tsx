import type { ReactElement, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Drawer.css';

export interface DrawerProps extends EscapeHatch {
  /** Accessible name, and the visible title unless hideTitle. Required. */
  title: string;
  /** Keep the title as the accessible name but don't show it (a navigation drawer that shows the brand instead). */
  hideTitle?: boolean;
  /** Short supporting text, announced with the title. */
  description?: string;
  /** The edge it slides from. end (default) for details and filters; start for navigation. */
  side?: 'start' | 'end';
  /** Width: sm for navigation, md (default) for details and filters. */
  size?: 'sm' | 'md';
  /** Element that opens the drawer, typically a system Button. It gets aria-expanded and aria-controls. */
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Actions pinned to the bottom. Put the primary action last. */
  footer?: ReactNode;
  /** Label of the close button (icon-only, so it needs a name). */
  closeLabel?: string;
  children?: ReactNode;
}

/**
 * Modal side sheet over a scrim. Focus trap, Escape, scroll lock, outside click and focus return
 * come from Radix Dialog; this component only lays it along an edge.
 */
export function Drawer({
  title,
  hideTitle = false,
  description,
  side = 'end',
  size = 'md',
  trigger,
  footer,
  closeLabel = 'Close',
  children,
  UNSAFE_className,
  UNSAFE_style,
  ...rootProps
}: DrawerProps) {
  return (
    <DialogPrimitive.Root {...rootProps}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="drawer__overlay" />
        <DialogPrimitive.Content
          className={cx('drawer', UNSAFE_className)}
          style={UNSAFE_style}
          data-side={side}
          data-size={size}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <header className="drawer__header">
            <DialogPrimitive.Title className={hideTitle ? 'visually-hidden' : 'drawer__title'}>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="drawer__close" aria-label={closeLabel}>
              <Icon name="close" />
            </DialogPrimitive.Close>
          </header>
          {description ? <DialogPrimitive.Description className="drawer__description">{description}</DialogPrimitive.Description> : null}
          {children ? <div className="drawer__body">{children}</div> : null}
          {footer ? <footer className="drawer__footer">{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
