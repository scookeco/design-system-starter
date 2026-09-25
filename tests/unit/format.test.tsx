// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormatter, currencyDigits } from '../../src/format/format';
import { LocaleProvider, useFormat } from '../../src/format/LocaleProvider';
import { Pagination } from '../../src/components/Pagination/Pagination';

afterEach(cleanup);

// Intl output uses narrow and non-breaking spaces in some locales; compare with plain spaces.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

const us = createFormatter({ locale: 'en-US', timeZone: 'UTC' });
const de = createFormatter({ locale: 'de-DE', timeZone: 'Europe/Berlin' });
const ja = createFormatter({ locale: 'ja-JP', timeZone: 'Asia/Tokyo' });
const ar = createFormatter({ locale: 'ar-EG', timeZone: 'Africa/Cairo' });

describe('date', () => {
  it('formats a calendar date with a month name, per locale', () => {
    expect(us.date('2026-09-12')).toBe('Sep 12, 2026');
    expect(de.date('2026-09-12')).toBe('12. Sept. 2026');
    expect(ja.date('2026-09-12')).toBe('2026年9月12日');
    expect(us.date('2026-09-12', 'short')).toBe('Sep 12');
    expect(us.date('2026-09-12', 'long')).toBe('September 12, 2026');
  });

  it('never shifts a calendar date by time zone', () => {
    const la = createFormatter({ locale: 'en-US', timeZone: 'America/Los_Angeles' });
    expect(la.date('2026-09-12')).toBe('Sep 12, 2026');
  });

  it('shows an instant in the provider’s time zone', () => {
    // 23:30 UTC on the 12th is already the 13th in Tokyo.
    expect(us.date('2026-09-12T23:30:00Z')).toBe('Sep 12, 2026');
    expect(ja.date('2026-09-12T23:30:00Z')).toBe('2026年9月13日');
  });
});

describe('time and dateTime', () => {
  it('uses the locale’s clock and the time zone', () => {
    expect(plain(us.time('2026-09-25T09:30:00Z'))).toBe('9:30 AM');
    expect(de.time('2026-09-25T09:30:00Z')).toBe('11:30');
  });

  it('labels the zone when asked', () => {
    expect(plain(us.dateTime('2026-09-25T09:30:00Z', { withZone: true }))).toBe('Sep 25, 2026, 9:30 AM UTC');
  });
});

describe('relative', () => {
  const now = '2026-09-25T12:00:00Z';
  it('picks the largest sensible unit and words the near ones', () => {
    expect(us.relative('2026-09-22T12:00:00Z', now)).toBe('3 days ago');
    expect(us.relative('2026-09-24T12:00:00Z', now)).toBe('yesterday');
    expect(us.relative('2026-09-25T10:00:00Z', now)).toBe('2 hours ago');
    expect(us.relative('2026-09-25T12:00:00Z', now)).toBe('now');
    expect(us.relative('2026-10-09T12:00:00Z', now)).toBe('in 2 weeks');
    expect(de.relative('2026-09-22T12:00:00Z', now)).toBe('vor 3 Tagen');
  });
});

describe('numbers', () => {
  it('groups for the locale', () => {
    expect(us.number(1284.5)).toBe('1,284.5');
    expect(de.number(1284.5)).toBe('1.284,5');
    expect(ar.number(1284)).toBe('١٬٢٨٤');
  });

  it('formats percentages from ratios', () => {
    expect(us.percent(0.125)).toBe('12.5%');
    expect(plain(de.percent(0.125))).toBe('12,5 %');
  });

  it('compacts large numbers', () => {
    expect(us.compact(1_200_000)).toBe('1.2M');
    expect(plain(de.compact(1_200_000))).toBe('1,2 Mio.');
  });
});

describe('money', () => {
  it('reads integer minor units with the currency’s own decimals', () => {
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('BHD')).toBe(3);
    expect(us.money(1_250_050, 'USD')).toBe('$12,500.50');
    expect(us.money(150_000, 'JPY')).toBe('¥150,000');
    expect(plain(us.money(1_250, 'BHD'))).toBe('BHD 1.250');
  });

  it('formats the account’s currency in the reader’s locale', () => {
    expect(plain(de.money(1_250_050, 'USD'))).toBe('12.500,50 $');
    expect(plain(de.money(1_250_050, 'EUR'))).toBe('12.500,50 €');
  });

  it('compacts for tiles', () => {
    expect(us.money(120_000_000, 'USD', { compact: true })).toBe('$1.2M');
    expect(us.money(18_200_000, 'USD', { compact: true })).toBe('$182K');
  });
});

describe('list', () => {
  it('joins for the locale', () => {
    expect(us.list(['Legal', 'Finance', 'Sales'])).toBe('Legal, Finance, and Sales');
    expect(us.list(['Legal', 'Finance'], 'disjunction')).toBe('Legal or Finance');
    expect(de.list(['Recht', 'Finanzen', 'Vertrieb'])).toBe('Recht, Finanzen und Vertrieb');
  });
});

describe('fileSize', () => {
  it('uses decimal units and one decimal place', () => {
    expect(plain(us.fileSize(512))).toBe('512 byte');
    expect(plain(us.fileSize(48_000))).toBe('48 kB');
    expect(plain(us.fileSize(1_200_000))).toBe('1.2 MB');
    expect(plain(de.fileSize(1_200_000))).toBe('1,2 MB');
    expect(plain(us.fileSize(18_000_000_000))).toBe('18 GB');
  });
});

describe('LocaleProvider', () => {
  function Probe() {
    const format = useFormat();
    return <p>{`${format.locale} ${format.timeZone} ${format.money(1_250_050, 'EUR')}`}</p>;
  }

  it('defaults to US English in UTC without a provider', () => {
    render(<Probe />);
    expect(screen.getByText(/^en-US UTC/).textContent).toBe('en-US UTC €12,500.50');
  });

  it('hands every format below it the locale and time zone', () => {
    render(
      <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
        <Probe />
      </LocaleProvider>,
    );
    expect(plain(screen.getByText(/^de-DE/).textContent ?? '')).toBe('de-DE Europe/Berlin 12.500,50 €');
  });

  it('formats system components too: the Pagination summary follows the locale', () => {
    render(
      <LocaleProvider locale="de-DE">
        <Pagination page={2} pageSize={25} total={1284} onPageChange={() => undefined} />
      </LocaleProvider>,
    );
    expect(screen.getByText('26–50 of 1.284')).toBeTruthy();
  });
});
