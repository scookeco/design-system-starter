/**
 * Static sample records for the pages that don't read from the mock API yet (the dashboard's
 * "Needs attention" table). The record type, its statuses and the status-to-tone map live in the
 * app layer (src/app); this file only holds a few fixed rows shaped like them.
 */
import type { Money, RecordStatus } from '../app/api/schemas';

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
