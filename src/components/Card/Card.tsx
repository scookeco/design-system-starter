import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import { RouterLink } from '../Link/Link';
import { Text } from '../Text/Text';
import './Card.css';

export type CardProps = Closed<ComponentPropsWithRef<'div'>> & {
  /** CardHeader, CardBody and CardFooter, in that order. Each is optional. */
  children: ReactNode;
};

/** A bounded surface for one titled block of a page: a record section, a settings group. */
export function Card({ children, UNSAFE_className, UNSAFE_style, ...rest }: CardProps) {
  return (
    <div {...rest} className={cx('card', UNSAFE_className)} style={UNSAFE_style}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  /** Section title. Required: a card without a title is just a box. */
  title: string;
  /** Outline level. Defaults to 2 (a section under the page's h1). */
  level?: HeadingLevel;
  /** One line under the title: what the section controls. */
  description?: string;
  /** Small section-level actions, e.g. a ghost "Add" button. */
  actions?: ReactNode;
}

export function CardHeader({ title, level = 2, description, actions }: CardHeaderProps) {
  return (
    <div className="card__header">
      <div className="card__heading">
        <Heading level={level} size={4}>
          {title}
        </Heading>
        {description ? (
          <Text size="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="card__actions">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="card__body">{children}</div>;
}

export interface CardFooterProps {
  children: ReactNode;
  /** end: actions only. between: a status on the start side, actions on the end. */
  justify?: 'end' | 'between';
}

export function CardFooter({ children, justify = 'end' }: CardFooterProps) {
  return (
    <div className="card__footer" data-justify={justify}>
      {children}
    </div>
  );
}

export interface CardLinkProps {
  /** Where the card goes. Routed through the app's LinkProvider, when there is one. */
  href: string;
  /** The card's name, and the link's accessible name with the description. Required. */
  title: string;
  /** Outline level of the title. Defaults to 3: these cards come in a grid under a section. */
  level?: HeadingLevel;
  /** One or two lines on what choosing it does. */
  description?: string;
  /** A quiet line at the foot of the card: a count, a size ("8 counterparties · 2 fields"). */
  meta?: string;
  /**
   * `unavailable` shows a choice that exists but can't be taken yet ("Coming soon"): not a link,
   * dashed and muted, with `badge` saying why. Default `available`.
   */
  state?: 'available' | 'unavailable';
  /** A Badge beside the title, e.g. "Coming soon" on an unavailable card. */
  badge?: ReactNode;
}

/**
 * A card that is one choice: the whole surface is a single link (an industry, a template, a
 * workspace to open). For a card with its own controls inside, use Card with a link in it; a link
 * can't contain other interactive things.
 */
export function CardLink({ href, title, level = 3, description, meta, state = 'available', badge }: CardLinkProps) {
  const content = (
    <>
      <span className="card__title-row">
        <Heading level={level} size={4}>
          {title}
        </Heading>
        {badge}
      </span>
      {/* Spaces between the parts, so the link's name reads "Retail Supply and…", not "RetailSupply…". */}
      {description ? <> <span className="card__description">{description}</span></> : null}
      {meta ? <> <span className="card__meta">{meta}</span></> : null}
    </>
  );
  return state === 'unavailable' ? (
    <div className="card" data-interactive="" data-state="unavailable">
      {content}
    </div>
  ) : (
    <RouterLink className="card" data-interactive="" href={href}>
      {content}
    </RouterLink>
  );
}
