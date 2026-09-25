import type { ReactNode } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Tabs.css';

export interface TabsProps extends EscapeHatch {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

/** Tabs: arrow-key roving focus and ARIA wiring come from Radix Tabs. */
export function Tabs({ UNSAFE_className, UNSAFE_style, ...rootProps }: TabsProps) {
  return <TabsPrimitive.Root {...rootProps} className={cx('tabs', UNSAFE_className)} style={UNSAFE_style} />;
}

export interface TabListProps {
  /** Accessible name of the tab list. Required. */
  label: string;
  children: ReactNode;
}

export function TabList({ label, children }: TabListProps) {
  return (
    <TabsPrimitive.List className="tabs__list" aria-label={label}>
      {children}
    </TabsPrimitive.List>
  );
}

export interface TabProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

export function Tab({ value, disabled, children }: TabProps) {
  return (
    <TabsPrimitive.Trigger className="tabs__tab" value={value} disabled={disabled}>
      {children}
    </TabsPrimitive.Trigger>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
}

export function TabPanel({ value, children }: TabPanelProps) {
  return (
    <TabsPrimitive.Content className="tabs__panel" value={value}>
      {children}
    </TabsPrimitive.Content>
  );
}
