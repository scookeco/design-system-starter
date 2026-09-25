/**
 * Locale formatting over Intl. Every number, date, amount and list a user reads goes through
 * one of these named formats, so the same concept looks the same on every screen and follows
 * the reader's locale and time zone. No hand-built strings ("$" + n, toFixed, toISOString).
 *
 * Formatter instances are cached per locale and options: building one per table cell is slow.
 */

export interface LocaleSettings {
  /** BCP 47 locale for formatting: "en-US", "de-DE", "ja-JP", "ar-EG". */
  locale: string;
  /** IANA time zone instants are shown in: "Europe/Berlin", "UTC". */
  timeZone: string;
}

/** An instant (ISO timestamp, epoch ms or Date), or a calendar date with no zone ("2026-09-30"). */
export type DateInput = string | number | Date;

export type DateStyle = 'short' | 'medium' | 'long';

export interface Formatter extends LocaleSettings {
  /** A calendar date: "Sep 12, 2026" (medium). ISO date-only strings are calendar dates and never shift by zone. */
  date: (value: DateInput, style?: DateStyle) => string;
  /** A time of day in the time zone: "9:30 AM". */
  time: (value: DateInput) => string;
  /** Date and time in the time zone, with a zone label when `withZone` is set: "Sep 12, 2026, 9:30 AM UTC". */
  dateTime: (value: DateInput, options?: { withZone?: boolean }) => string;
  /** Recency against `now`: "3 days ago", "yesterday", "in 2 hours". */
  relative: (value: DateInput, now?: DateInput) => string;
  /** A plain number with the locale's grouping: "1,284" / "1.284". */
  number: (value: number, options?: { maximumFractionDigits?: number }) => string;
  /** A ratio as a percentage: 0.125 → "12.5%". */
  percent: (value: number, options?: { maximumFractionDigits?: number }) => string;
  /** A short, rounded number for tiles: "1.2K", "3.4M". */
  compact: (value: number) => string;
  /** Money from integer minor units and an ISO 4217 code: (1250050, "USD") → "$12,500.50"; (1500, "JPY") → "¥1,500". */
  money: (minor: number, currency: string, options?: { compact?: boolean }) => string;
  /** A list joined for the locale: "Legal, Finance, and Sales". */
  list: (items: readonly string[], type?: 'conjunction' | 'disjunction') => string;
  /** A size in bytes, decimal units: 1_200_000 → "1.2 MB". */
  fileSize: (bytes: number) => string;
}

const cache = new Map<string, unknown>();
const cached = <T>(key: string, create: () => T): T => {
  const hit = cache.get(key) as T | undefined;
  if (hit) return hit;
  const made = create();
  cache.set(key, made);
  return made;
};

const numberFormat = (locale: string, options: Intl.NumberFormatOptions) =>
  cached(`n|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options));
const dateFormat = (locale: string, options: Intl.DateTimeFormatOptions) =>
  cached(`d|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options));
const relativeFormat = (locale: string) => cached(`r|${locale}`, () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
const listFormat = (locale: string, type: 'conjunction' | 'disjunction') =>
  cached(`l|${locale}|${type}`, () => new Intl.ListFormat(locale, { style: 'long', type }));

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toDate = (value: DateInput): Date => {
  if (value instanceof Date) return value;
  // A date-only string is a calendar day: pin it to UTC midnight and format it in UTC, so it never
  // shows as the day before west of Greenwich.
  if (typeof value === 'string' && CALENDAR_DATE.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(value);
};

const isCalendarDate = (value: DateInput) => typeof value === 'string' && CALENDAR_DATE.test(value);

const DATE_STYLE: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

/** Largest unit first. Each step: the unit, and how many seconds it holds. */
const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

const FILE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

/** Decimal places a currency's minor unit has: USD 2, JPY 0, BHD 3. */
export const currencyDigits = (currency: string) =>
  numberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

/** Formats for one locale and time zone. Prefer `useFormat()` inside React; this is for tests and non-React code. */
export function createFormatter({ locale, timeZone }: LocaleSettings): Formatter {
  return {
    locale,
    timeZone,
    date: (value, style = 'medium') =>
      dateFormat(locale, { ...DATE_STYLE[style], timeZone: isCalendarDate(value) ? 'UTC' : timeZone }).format(toDate(value)),
    time: (value) => dateFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(toDate(value)),
    dateTime: (value, options) =>
      dateFormat(locale, {
        ...DATE_STYLE.medium,
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
        ...(options?.withZone ? { timeZoneName: 'short' } : {}),
      }).format(toDate(value)),
    relative: (value, now = Date.now()) => {
      const seconds = (toDate(value).getTime() - toDate(now).getTime()) / 1000;
      const [unit, size] = RELATIVE_UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ['second', 1];
      return relativeFormat(locale).format(Math.round(seconds / size), unit);
    },
    number: (value, options) => numberFormat(locale, { maximumFractionDigits: options?.maximumFractionDigits ?? 2 }).format(value),
    percent: (value, options) => numberFormat(locale, { style: 'percent', maximumFractionDigits: options?.maximumFractionDigits ?? 1 }).format(value),
    compact: (value) => numberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value),
    money: (minor, currency, options) => {
      const value = minor / 10 ** currencyDigits(currency);
      return numberFormat(locale, {
        style: 'currency',
        currency,
        ...(options?.compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      }).format(value);
    },
    list: (items, type = 'conjunction') => listFormat(locale, type).format(items),
    fileSize: (bytes) => {
      let value = Math.max(0, bytes);
      let index = 0;
      while (value >= 1000 && index < FILE_UNITS.length - 1) {
        value /= 1000;
        index += 1;
      }
      return numberFormat(locale, {
        style: 'unit',
        unit: FILE_UNITS[index] ?? 'byte',
        unitDisplay: 'short',
        maximumFractionDigits: index === 0 ? 0 : 1,
      }).format(value);
    },
  };
}
