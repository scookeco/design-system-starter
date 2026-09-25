/**
 * The one place a record status maps to its label and tone. A new status extends this map;
 * it never adds a badge.
 */
import type { BadgeTone } from '../../index';
import type { RecordStatus } from '../api/schemas';

export const STATUS: Record<RecordStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  archived: { label: 'Archived', tone: 'neutral' },
};
