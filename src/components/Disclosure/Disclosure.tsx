import type { ReactNode } from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Disclosure.css';

export interface DisclosureProps extends EscapeHatch {
  /** The always-visible summary, and the toggle's accessible name ("Searched 12 records"). Required. */
  summary: string;
  /** Beside the summary: a status Badge ("Done"), a count. Not part of the toggle. */
  meta?: ReactNode;
  /** What opens: tool input and output, reasoning steps, details. */
  children: ReactNode;
  open?: boolean;
  /** Closed by default: details are there when wanted, not in the way. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * One section that shows and hides its details: an assistant's tool activity or reasoning, an
 * advanced option. The toggle is a button with aria-expanded; from Radix Collapsible. For a stack of
 * sections where opening one may close another, use Accordion.
 */
export function Disclosure({ summary, meta, children, defaultOpen = false, UNSAFE_className, UNSAFE_style, ...rootProps }: DisclosureProps) {
  return (
    <CollapsiblePrimitive.Root {...rootProps} defaultOpen={defaultOpen} className={cx('disclosure', UNSAFE_className)} style={UNSAFE_style}>
      <div className="disclosure__header">
        <CollapsiblePrimitive.Trigger className="disclosure__trigger">
          <Icon name="chevron-right" />
          <span>{summary}</span>
        </CollapsiblePrimitive.Trigger>
        {meta ? <span className="disclosure__meta">{meta}</span> : null}
      </div>
      <CollapsiblePrimitive.Content className="disclosure__content">{children}</CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
