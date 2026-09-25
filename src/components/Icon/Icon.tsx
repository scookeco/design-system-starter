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
  'chevron-right': 'M8 5l5 5-5 5',
  'chevron-left': 'M12 5l-5 5 5 5',
  home: 'M3 9.5L10 3l7 6.5M5 8v9h10V8M8.5 17v-5h3v5',
  file: 'M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5',
  users: 'M7.5 9a3 3 0 100-6 3 3 0 000 6zM2 17a5.5 5.5 0 0111 0M13 3.3a3 3 0 010 5.4M15 11.8A5.5 5.5 0 0118 17',
  settings: 'M3 6h14M3 14h14M7 3.5v5M13 11.5v5',
  menu: 'M3 5h14M3 10h14M3 15h14',
  more: 'M5 11a1 1 0 100-2 1 1 0 000 2zM10 11a1 1 0 100-2 1 1 0 000 2zM15 11a1 1 0 100-2 1 1 0 000 2z',
} as const;

export type IconName = keyof typeof PATHS;

/** Every icon name, for the Foundations icon page. Internal: not exported from src/index.ts. */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

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
