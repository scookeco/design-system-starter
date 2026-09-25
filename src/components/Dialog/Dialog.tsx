import type { ReactElement, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Dialog.css';

export interface DialogProps extends EscapeHatch {
  /** Accessible name and visible title. Required. */
  title: string;
  /** Short supporting text, announced with the title. */
  description?: string;
  /** Element that opens the dialog, typically a system Button. */
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Actions row. Put the primary action last. */
  footer?: ReactNode;
  /** Label of the close button (icon-only, so it needs a name). */
  closeLabel?: string;
  children?: ReactNode;
}

/**
 * Modal dialog. Focus trap, Escape, scroll lock and focus return come from Radix Dialog.
 */
export function Dialog({
  title,
  description,
  trigger,
  size = 'md',
  footer,
  closeLabel = 'Close',
  children,
  UNSAFE_className,
  UNSAFE_style,
  ...rootProps
}: DialogProps) {
  return (
    <DialogPrimitive.Root {...rootProps}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog__overlay">
          <DialogPrimitive.Content
            className={cx('dialog', UNSAFE_className)}
            style={UNSAFE_style}
            data-size={size}
            {...(description ? {} : { 'aria-describedby': undefined })}
          >
            <header className="dialog__header">
              <DialogPrimitive.Title className="dialog__title">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="dialog__close" aria-label={closeLabel}>
                <Icon name="close" />
              </DialogPrimitive.Close>
            </header>
            {description ? <DialogPrimitive.Description className="dialog__description">{description}</DialogPrimitive.Description> : null}
            {children ? <div className="dialog__body">{children}</div> : null}
            {footer ? <footer className="dialog__footer">{footer}</footer> : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
