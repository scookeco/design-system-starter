import './Icon.css';

/*
 * The system's closed icon set. Icons are decorative (aria-hidden): meaning always
 * comes from adjacent text or an accessible name on the control.
 * Adding an icon is a design-system change, not a consumer import.
 */
const PATHS = {
  check: 'M4 10.5l4 4 8-9',
  success: 'M10 18a8 8 0 100-16 8 8 0 000 16zM6.5 10.5l2.5 2.5 4.5-5',
  warning: 'M10 3l8 14H2L10 3zM10 8v4M10 14.5v.5',
  danger: 'M10 18a8 8 0 100-16 8 8 0 000 16zM7 7l6 6M13 7l-6 6',
  info: 'M10 18a8 8 0 100-16 8 8 0 000 16zM10 9v5M10 6.5V6',
  close: 'M5 5l10 10M15 5L5 15',
  'chevron-down': 'M5 8l5 5 5-5',
  'sort-ascending': 'M10 4v12M5 9l5-5 5 5',
  'sort-descending': 'M10 4v12M5 11l5 5 5-5',
  'sort-none': 'M6 8l4-4 4 4M6 12l4 4 4-4',
  plus: 'M10 4v12M4 10h12',
  search: 'M9 15a6 6 0 100-12 6 6 0 000 12zM13.5 13.5L17 17',
  minus: 'M4 10h12',
  download: 'M10 3v10M5.5 8.5L10 13l4.5-4.5M4 16h12',
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  size?: 'sm' | 'md';
}

export function Icon({ name, size = 'sm' }: IconProps) {
  return (
    <svg className="icon" data-size={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
