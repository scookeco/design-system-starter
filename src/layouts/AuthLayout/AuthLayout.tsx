import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Cover } from '../../primitives/Cover/Cover';
import './AuthLayout.css';

export interface AuthLayoutProps extends EscapeHatch {
  /** Product name or mark, above the card. */
  brand: ReactNode;
  /** The card's content: the page's h1 first (a Heading at level 1), then the form. */
  children: ReactNode;
  /** Links under the card: privacy, terms, help. */
  footer?: ReactNode;
}

/**
 * The frame for signed-out pages (sign-in, sign-up, password reset, an error before the app can
 * load): a brand, one centred card on a plain surface, and a footer. No navigation, no shell.
 */
export function AuthLayout({ brand, children, footer, UNSAFE_className, UNSAFE_style }: AuthLayoutProps) {
  return (
    <div className={cx('auth-layout', UNSAFE_className)} style={UNSAFE_style}>
      <Cover
        minBlockSize="viewport"
        gap="xl"
        header={<header className="auth-layout__brand">{brand}</header>}
        footer={footer ? <footer className="auth-layout__footer">{footer}</footer> : undefined}
      >
        <main className="auth-layout__main">
          <div className="auth-layout__card">{children}</div>
        </main>
      </Cover>
    </div>
  );
}
