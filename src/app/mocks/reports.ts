/**
 * The mock reports: aggregates over the records this grant may see, computed on each request from
 * the database, so a write (an import, a delete) shows in the next read. Months are calendar
 * months from the seed's "today".
 */
import { http, HttpResponse } from 'msw';
import { MOVABLE_STATUSES, type Money } from '../api/schemas';
import { canSee } from '../model/permissions';
import { hasStatus, isArchived } from '../model/predicates';
import { WORKSPACES } from '../workspaces';
import { db } from './db';
import { handle } from './route';
import { SEED_EPOCH } from './seed';

const API = '*/api/t/:tenant';
/** How many accounts the report names; the rest are one "other" total. */
export const TOP_ACCOUNTS = 6;

const monthsFrom = (iso: string, count: number) => {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
};

export const reportHandlers = [
  http.get(
    `${API}/reports`,
    handle('record:read', ({ tenant, grant, request }) => {
      const horizon = new URL(request.url).searchParams.get('horizon') === '12' ? 12 : 6;
      const currency = WORKSPACES[tenant].currency;
      const money = (minor: number): Money => ({ minor, currency });
      const records = db(tenant).records.filter((r) => canSee(grant, r) && !isArchived(r));

      const byStatus = MOVABLE_STATUSES.map((status) => ({ status, count: records.filter(hasStatus(status)).length }));

      const totals = new Map<string, { value: number; records: number }>();
      for (const r of records) {
        if (!r.accountId) continue;
        const t = totals.get(r.accountId) ?? { value: 0, records: 0 };
        totals.set(r.accountId, { value: t.value + r.amount.minor, records: t.records + 1 });
      }
      const ranked = [...totals.entries()].sort((a, b) => b[1].value - a[1].value || a[0].localeCompare(b[0]));
      const top = ranked.slice(0, TOP_ACCOUNTS);
      const rest = ranked.slice(TOP_ACCOUNTS);

      const months = monthsFrom(new Date(SEED_EPOCH).toISOString().slice(0, 7), horizon);
      const renewals = months.map((month) => {
        const due = records.filter((r) => r.renewsOn.startsWith(month));
        return { month, value: money(due.reduce((sum, r) => sum + r.amount.minor, 0)), count: due.length };
      });

      return HttpResponse.json({
        byStatus,
        byAccount: top.map(([accountId, t]) => ({ accountId, value: money(t.value), records: t.records })),
        otherAccounts: { value: money(rest.reduce((sum, [, t]) => sum + t.value, 0)), records: rest.reduce((sum, [, t]) => sum + t.records, 0), accounts: rest.length },
        renewals,
        horizon,
      });
    }),
  ),
];
