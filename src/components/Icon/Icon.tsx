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
  upload: 'M10 13V3M5.5 7.5L10 3l4.5 4.5M4 16h12',
  copy: 'M7 7h9.5v9.5H7zM13 7V3.5H3.5V13H7',
  'chevron-right': 'M8 5l5 5-5 5',
  'chevron-left': 'M12 5l-5 5 5 5',
  home: 'M3 9.5L10 3l7 6.5M5 8v9h10V8M8.5 17v-5h3v5',
  file: 'M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5',
  users: 'M7.5 9a3 3 0 100-6 3 3 0 000 6zM2 17a5.5 5.5 0 0111 0M13 3.3a3 3 0 010 5.4M15 11.8A5.5 5.5 0 0118 17',
  building: 'M4.5 17.5v-14h8v14M12.5 8h3v9.5M2.5 17.5h15M7 6.5h3M7 9.5h3M7 12.5h3',
  settings: 'M3 6h14M3 14h14M7 3.5v5M13 11.5v5',
  menu: 'M3 5h14M3 10h14M3 15h14',
  'trend-up': 'M3 14l5-5 3 3 6-6M12 6h5v5',
  'trend-down': 'M3 6l5 5 3-3 6 6M12 14h5v-5',
  more: 'M5 11a1 1 0 100-2 1 1 0 000 2zM10 11a1 1 0 100-2 1 1 0 000 2zM15 11a1 1 0 100-2 1 1 0 000 2z',
  eye: 'M1.5 10C3.5 6.5 6.5 4.5 10 4.5s6.5 2 8.5 5.5c-2 3.5-5 5.5-8.5 5.5S3.5 13.5 1.5 10zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  'eye-off': 'M1.5 10C3.5 6.5 6.5 4.5 10 4.5s6.5 2 8.5 5.5c-2 3.5-5 5.5-8.5 5.5S3.5 13.5 1.5 10zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 3.5l13 13',
  // AI patterns: the sparkle marks AI (and only AI); the rest are chat and feedback actions.
  sparkle: 'M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4L4 8.5l4.4-1.6zM15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  stop: 'M6 6h8v8H6z',
  'thumbs-up': 'M6.5 9v8h-3V9zM6.5 9l3-6c1.4 0 2 1 2 2.2V8h4a1.5 1.5 0 011.5 1.8l-1.2 5.5a2 2 0 01-2 1.7H6.5',
  'thumbs-down': 'M6.5 11V3h-3v8zM6.5 11l3 6c1.4 0 2-1 2-2.2V12h4a1.5 1.5 0 001.5-1.8l-1.2-5.5a2 2 0 00-2-1.7H6.5',
  inbox: 'M3 11l2.5-7h9l2.5 7v5.5H3zM3 11h4l1 2h4l1-2h4',
  archive: 'M3 4h14v3.5H3zM4.5 7.5v9h11v-9M8 11h4',
  calendar: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v4M13 3v4',
  edit: 'M13.5 3.5l3 3L7 16H4v-3zM11.5 5.5l3 3',
  shield: 'M10 2.5l6 2.5v5c0 3.5-2.5 6-6 7.5-3.5-1.5-6-4-6-7.5V5z',
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
