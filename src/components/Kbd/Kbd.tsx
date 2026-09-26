import type { ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import './Kbd.css';

export type KbdProps = Closed<Omit<ComponentPropsWithRef<'kbd'>, 'children'>> & {
  /** One key, as printed on it: "Tab", "Esc", "Enter", "⌘". For a combination, render one Kbd per key. */
  children: string;
};

/** A key the person presses, in a key-cap style: keyboard hints ("Tab to accept"), shortcut lists. */
export function Kbd({ children, UNSAFE_className, UNSAFE_style, ...rest }: KbdProps) {
  return (
    <kbd {...rest} className={cx('kbd', UNSAFE_className)} style={UNSAFE_style}>
      {children}
    </kbd>
  );
}
