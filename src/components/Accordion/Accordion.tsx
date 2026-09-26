import type { ReactNode } from 'react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import '../Disclosure/Disclosure.css';
import './Accordion.css';

export interface AccordionItem {
  /** Stable id for the item (what `value` and `defaultValue` name). */
  value: string;
  /** The item's heading and toggle. */
  title: string;
  /** Beside the title: a status Badge, a count. */
  meta?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface AccordionBase extends EscapeHatch {
  items: readonly AccordionItem[];
  /** Heading level of each item's title, so the outline stays right where it sits. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export type AccordionProps = AccordionBase &
  (
    | { type?: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
    | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void }
  );

/**
 * A stack of titled sections that open and close: steps an agent took, FAQ-style details. Each
 * title is a heading wrapping a button with aria-expanded; arrow keys move between titles. From
 * Radix Accordion. `single` (default) keeps one open; `multiple` lets several stay open.
 */
export function Accordion({ items, headingLevel = 3, UNSAFE_className, UNSAFE_style, ...rootProps }: AccordionProps) {
  const heading = `h${String(headingLevel)}` as 'h3';
  const body = items.map((item) => (
    <AccordionPrimitive.Item key={item.value} value={item.value} disabled={item.disabled} className="accordion__item disclosure">
      <AccordionPrimitive.Header asChild>
        {/* The heading element carries the level; the trigger inside it is the button. */}
        {headingElement(heading, item)}
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="disclosure__content">{item.content}</AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  ));
  const className = cx('accordion', UNSAFE_className);
  return rootProps.type === 'multiple' ? (
    <AccordionPrimitive.Root {...rootProps} className={className} style={UNSAFE_style}>
      {body}
    </AccordionPrimitive.Root>
  ) : (
    <AccordionPrimitive.Root collapsible {...rootProps} type="single" className={className} style={UNSAFE_style}>
      {body}
    </AccordionPrimitive.Root>
  );
}

function headingElement(Heading: 'h3', item: AccordionItem) {
  return (
    <Heading className="accordion__heading disclosure__header">
      <AccordionPrimitive.Trigger className="disclosure__trigger">
        <Icon name="chevron-right" />
        <span>{item.title}</span>
      </AccordionPrimitive.Trigger>
      {item.meta ? <span className="disclosure__meta">{item.meta}</span> : null}
    </Heading>
  );
}
