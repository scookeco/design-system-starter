import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createFormatter, type Formatter } from './format';

/** Without a provider: US English in UTC, so output never depends on the machine it runs on. */
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIME_ZONE = 'UTC';

const FormatContext = createContext<Formatter>(createFormatter({ locale: DEFAULT_LOCALE, timeZone: DEFAULT_TIME_ZONE }));

export interface LocaleProviderProps {
  /** BCP 47 locale for formatting, from the user's profile (defaulting from the browser). */
  locale?: string;
  /** IANA time zone, from the user's profile. Travelling users and shared screens break auto-detection. */
  timeZone?: string;
  children: ReactNode;
}

/**
 * Sets the locale and time zone every system and app format reads. Wrap the app once, near the
 * root, with the signed-in user's settings. The formatting locale is separate from the UI language:
 * an English UI can format German dates.
 */
export function LocaleProvider({ locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, children }: LocaleProviderProps) {
  const formatter = useMemo(() => createFormatter({ locale, timeZone }), [locale, timeZone]);
  return <FormatContext value={formatter}>{children}</FormatContext>;
}

/** The named formats for the current locale and time zone: `format.money(minor, 'USD')`, `format.date(iso)`. */
export function useFormat(): Formatter {
  return useContext(FormatContext);
}
