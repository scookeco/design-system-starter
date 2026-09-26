import type { ReactNode } from 'react';
import { Toolbar as ToolbarPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import { Tooltip } from '../Tooltip/Tooltip';
import './Toolbar.css';

export interface ToolbarProps extends EscapeHatch {
  /** Accessible name: what the controls act on ("Conversation actions"). Required. */
  label: string;
  orientation?: 'horizontal' | 'vertical';
  /** ToolbarButton and ToolbarSeparator. */
  children: ReactNode;
}

/**
 * A row of related controls that is one tab stop: Tab enters it, ← → (↑ ↓ vertical) move between
 * its buttons, Home and End jump, Tab leaves. For an editor's formatting bar or a selection's
 * actions; not for page navigation. Behaviour from Radix Toolbar (roving tabindex).
 */
export function Toolbar({ label, orientation = 'horizontal', children, UNSAFE_className, UNSAFE_style }: ToolbarProps) {
  return (
    <ToolbarPrimitive.Root className={cx('toolbar', UNSAFE_className)} style={UNSAFE_style} aria-label={label} orientation={orientation} loop>
      {children}
    </ToolbarPrimitive.Root>
  );
}

export interface ToolbarButtonProps {
  /** Verb-first label. Also the accessible name when the label is hidden. Required. */
  children: string;
  icon?: IconName;
  /** Show only the icon; the label moves into a tooltip and the accessible name. Needs `icon`. */
  hideLabel?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** A toggle (Bold, Unread only): its state as aria-pressed. */
  pressed?: boolean;
  /** Its keyboard shortcut, shown in the tooltip (register it with useShortcut). */
  shortcut?: string;
  tone?: 'default' | 'danger';
}

/** One control in a Toolbar. A hidden label or a shortcut shows in a tooltip on hover and focus. */
export function ToolbarButton({ children, icon, hideLabel = false, onClick, disabled, pressed, shortcut, tone = 'default' }: ToolbarButtonProps) {
  const button = (
    <ToolbarPrimitive.Button
      className="toolbar__button"
      data-tone={tone}
      data-icon-only={hideLabel && icon ? 'true' : undefined}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={hideLabel && icon ? children : undefined}
      onClick={onClick}
    >
      {icon ? <Icon name={icon} /> : null}
      {hideLabel && icon ? null : <span>{children}</span>}
    </ToolbarPrimitive.Button>
  );
  if (!shortcut && !(hideLabel && icon)) return button;
  return (
    <Tooltip content={children} {...(shortcut ? { shortcut } : {})}>
      {button}
    </Tooltip>
  );
}

/** A divider between groups of toolbar controls. */
export function ToolbarSeparator() {
  return <ToolbarPrimitive.Separator className="toolbar__separator" />;
}
