import type { HTMLAttributes, ReactNode } from 'react';
import type { Closed } from '../internal/closed-api';

/** Elements a layout primitive may render as. Closed on purpose: layout, not widgets. */
export type LayoutElement =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'header'
  | 'footer'
  | 'main'
  | 'nav'
  | 'form'
  | 'fieldset'
  | 'ul'
  | 'ol'
  | 'li';

export type LayoutProps = Closed<HTMLAttributes<HTMLElement>> & {
  /** Semantic element to render. Defaults to div. */
  as?: LayoutElement;
  children?: ReactNode;
};
