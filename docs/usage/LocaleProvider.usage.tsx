import { createFormatter, currencyDigits, LocaleProvider, Stat, Text, useFormat } from '../../src/index';
import type { UsageDoc } from './types';

function Balance() {
  const format = useFormat();
  return <Stat label="Contract value" value={format.money(120_000_000, 'EUR', { compact: true })} />;
}

export const usage: UsageDoc = {
  covers: [LocaleProvider, useFormat, createFormatter, currencyDigits],
  whenToUse: [
    'Wrap the app once, near the root, with the signed-in user’s locale and time zone (a profile setting that defaults from the browser).',
    'Format every number, date, amount, list and file size a person reads with `useFormat()`: `format.money(minor, currency)`, `format.date(iso)`, `format.relative(iso)`. One named format per concept keeps every screen consistent.',
    'Money arrives as integer minor units plus an ISO 4217 code. Format the account’s currency in the reader’s locale: a German reader billed in USD sees `12.500,50 $`.',
    'An ISO date with no time (`2026-09-30`) is a calendar date and never shifts by zone; a timestamp is an instant, shown in the provider’s time zone.',
    'Outside React (tests, exports), `createFormatter({ locale, timeZone })` gives the same formats.',
    'Turning typed money into minor units: multiply by `10 ** currencyDigits(code)` (2 for USD, 0 for JPY, 3 for BHD) and round.',
  ],
  whenNotToUse: [
    { situation: 'Dates and numbers in APIs, exports and logs', instead: 'ISO 8601 and plain numbers; format only for people' },
    { situation: 'Translating UI copy', instead: 'the app’s message catalogue; formatting locale and UI language are separate settings' },
    { situation: 'A one-off `Intl.NumberFormat` or `toFixed` in a page', instead: 'a named format here, or a new one added to it' },
  ],
  do: {
    caption: 'The value is formatted by the provider: the reader’s separators, the account’s currency.',
    render: () => (
      <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
        <Balance />
      </LocaleProvider>
    ),
  },
  dont: {
    caption: 'A hand-built string: US separators and a “$” for every reader, whatever the currency.',
    render: () => <Text>{`$${(1200000).toFixed(2)}`}</Text>,
  },
  accessibility: [
    'Locale formats are what screen readers expect: “12.5%” and “Sep 12, 2026” are read naturally; “12.5 pct” and “09/12/26” are not.',
    'Prefer month names over numeric dates in the UI: `03/04/2026` means different days in different regions.',
    'Show relative times (“3 days ago”) with the absolute date nearby or on hover when precision matters.',
    'Numbers in tables still need `numeric` cells, so digits line up in every locale.',
  ],
};
