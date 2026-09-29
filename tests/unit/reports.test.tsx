// @vitest-environment jsdom
/**
 * Reports: the server's aggregates (over what the person may see) and the page, whose every chart
 * has its answer in words and its numbers as a table.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { getReport } from '../../src/app/api/reports';
import { db, setRoles } from '../../src/app/mocks/db';
import { TOP_ACCOUNTS } from '../../src/app/mocks/reports';
import { ReportsPage } from '../../src/examples/ReportsPage';
import { handlers } from '../../src/app/mocks/handlers';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, server, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

describe('the mock reports API', () => {
  it('counts what isn’t archived, ranks accounts with the rest as Other, and fills every month', async () => {
    const report = await getReport('acme', 6);
    const live = db('acme').records.filter((r) => r.status !== 'archived');
    expect(report.byStatus.reduce((sum, s) => sum + s.count, 0)).toBe(live.length);
    expect(report.byAccount).toHaveLength(TOP_ACCOUNTS);
    const values = report.byAccount.map((a) => a.value.minor);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    const withAccount = live.filter((r) => r.accountId !== null);
    expect(report.byAccount.reduce((sum, a) => sum + a.value.minor, 0) + report.otherAccounts.value.minor).toBe(withAccount.reduce((sum, r) => sum + r.amount.minor, 0));
    expect(report.renewals.map((r) => r.month)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    expect((await getReport('acme', 12)).renewals).toHaveLength(12);
    expect((await getReport('globex', 6)).byAccount[0]?.value.currency).toBe('EUR');
  });

  it('leaves a viewer’s drafts out of every aggregate', async () => {
    setRoles('viewer');
    const report = await getReport('acme', 6);
    expect(report.byStatus.find((s) => s.status === 'draft')?.count).toBe(0);
  });
});

describe('the reports page', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('says each answer in words, names each chart by it, and opens its numbers as a table', async () => {
    const { history } = renderWithApp(<ReportsPage />, { url: '/reports' });
    const status = await screen.findByRole('img', { name: /^Records by status\. Active is the largest share/ }, FIRST_PAINT);
    expect(status).toBeTruthy();
    expect(screen.getByRole('list', { name: /^Contract value by account\./ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Renewals by month, Sep 2026 to Feb 2027\. Busiest month:/ })).toBeTruthy();
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Active: \d+ \(\d+%\)$/)]));
    fireEvent.click(screen.getAllByText('Show the numbers')[2] as HTMLElement);
    const table = await screen.findByRole('table', { name: 'Renewals by month' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    fireEvent.click(screen.getByRole('radio', { name: 'Next 12 months' }));
    expect(history.location().search).toBe('?horizon=12');
    expect(await screen.findByRole('img', { name: /Sep 2026 to Aug 2027/ })).toBeTruthy();
  });

  it('keeps one row per account when the names arrive after the chart has drawn', async () => {
    // Hold the account directory, so the chart first draws with every name still "…".
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(
        '*/api/t/acme/accounts',
        async ({ request }) => {
          await gate;
          return getResponse(handlers, request);
        },
        { once: true },
      ),
    );
    renderWithApp(<ReportsPage />, { url: '/reports' });
    const accounts = await screen.findByRole('list', { name: /^Contract value by account\./ }, FIRST_PAINT);
    const rows = () => within(accounts).getAllByRole('listitem');
    const count = rows().length;
    expect(rows().every((li) => li.textContent?.startsWith('…'))).toBe(true);
    release();
    await waitFor(() => expect(rows().some((li) => li.textContent?.startsWith('…'))).toBe(false));
    // The same rows, now named: none left over from the first draw.
    expect(rows()).toHaveLength(count);
  });
});
