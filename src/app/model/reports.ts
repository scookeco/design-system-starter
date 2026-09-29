/**
 * Reports: one read per horizon, under the partition (a viewer's aggregates have no drafts, so they
 * never share an admin's cache entry). A report has no writes; it's stale after any record write
 * the way lists are, and the page refetches it when it's next shown.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getReport, type ReportHorizon } from '../api/reports';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';

export const reportKeys = {
  all: (p: Partition) => [...p, 'reports'] as const,
  report: (p: Partition, horizon: ReportHorizon) => [...p, 'reports', { horizon }] as const,
};

export function useReport(horizon: ReportHorizon) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: reportKeys.report(partition, horizon), queryFn: ({ signal }) => getReport(tenant, horizon, signal), placeholderData: keepPreviousData });
}
