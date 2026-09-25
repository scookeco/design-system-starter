import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Heading, type HeadingLevel } from '../Heading/Heading';
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
