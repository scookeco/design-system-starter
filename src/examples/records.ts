/**
 * The example domain, shared by every example page: one record type, one status-to-tone map.
 * In a product this lives in the model layer, not beside the pages.
 */
import type { BadgeTone } from '../index';

export type RecordStatus = 'active' | 'pending' | 'overdue' | 'draft';

/** The one place a domain status maps to a tone. A new status extends this map; it never adds a badge. */
export const STATUS: Record<RecordStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Pending', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  draft: { label: 'Draft', tone: 'neutral' },
};

/** Money travels as integer minor units (cents) with its currency code; never as a float. */
export interface Money {
  minor: number;
  currency: string;
}

export interface RecordItem {
  id: string;
  name: string;
  owner: string;
  status: RecordStatus;
  amount: Money;
  /** Calendar date of the last change (ISO 8601, no zone). */
  updated: string;
}

export const SAMPLE_RECORDS: readonly RecordItem[] = [
  { id: 'r-1001', name: 'Annual services agreement', owner: 'Operations', status: 'active', amount: { minor: 4800000, currency: 'USD' }, updated: '2026-09-12' },
  { id: 'r-1002', name: 'Hardware lease', owner: 'Facilities', status: 'pending', amount: { minor: 1250050, currency: 'USD' }, updated: '2026-09-10' },
  { id: 'r-1003', name: 'Consulting retainer', owner: 'Finance', status: 'overdue', amount: { minor: 720000, currency: 'USD' }, updated: '2026-08-30' },
  { id: 'r-1004', name: 'Office cleaning', owner: 'Facilities', status: 'active', amount: { minor: 315000, currency: 'USD' }, updated: '2026-08-28' },
  { id: 'r-1005', name: 'Data processing addendum', owner: 'Legal', status: 'draft', amount: { minor: 0, currency: 'USD' }, updated: '2026-08-21' },
  { id: 'r-1006', name: 'Software licences', owner: 'Engineering', status: 'active', amount: { minor: 9640000, currency: 'USD' }, updated: '2026-08-19' },
  { id: 'r-1007', name: 'Event venue', owner: 'Marketing', status: 'pending', amount: { minor: 1890000, currency: 'USD' }, updated: '2026-08-02' },
];

/** Where a page's data stands. A real page derives this from its query; the examples take it as a prop. */
export type LoadState = 'loading' | 'ready' | 'error';
