/*
 * The system's closed icon set, one value per icon, drawn on one 20-unit grid with one stroke
 * token. A component takes an icon as a value (`icon={InboxIcon}`), so a bundle carries only the
 * icons its code names: no lookup by name, which would pull in the whole set.
 *
 * Each icon is a plain object literal, never a call, so bundlers can drop the ones nobody imports.
 * Adding an icon is a design-system change: add it here, on the same grid and stroke, and to the
 * list in ./names.ts (the Foundations page and the deprecated lookup read it).
 */

/** An icon from the system set: pass it to a component's `icon` prop. */
export interface IconDefinition {
  /** Its name in the set (Foundations/Icons), kebab-case. */
  readonly name: string;
  /** The path data, on the 20-unit grid, stroked (never filled). */
  readonly path: string;
}

// Status and feedback
export const CheckIcon: IconDefinition = { name: 'check', path: 'M4 10.5l4 4 8-9' };
export const SuccessIcon: IconDefinition = { name: 'success', path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM6.5 10.5l2.5 2.5 4.5-5' };
export const WarningIcon: IconDefinition = { name: 'warning', path: 'M10 3l8 14H2L10 3zM10 8v4M10 14.5v.5' };
export const DangerIcon: IconDefinition = { name: 'danger', path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM7 7l6 6M13 7l-6 6' };
export const InfoIcon: IconDefinition = { name: 'info', path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM10 9v5M10 6.5V6' };

// Controls
export const CloseIcon: IconDefinition = { name: 'close', path: 'M5 5l10 10M15 5L5 15' };
export const ChevronDownIcon: IconDefinition = { name: 'chevron-down', path: 'M5 8l5 5 5-5' };
export const ChevronRightIcon: IconDefinition = { name: 'chevron-right', path: 'M8 5l5 5-5 5' };
export const ChevronLeftIcon: IconDefinition = { name: 'chevron-left', path: 'M12 5l-5 5 5 5' };
export const SortAscendingIcon: IconDefinition = { name: 'sort-ascending', path: 'M10 4v12M5 9l5-5 5 5' };
export const SortDescendingIcon: IconDefinition = { name: 'sort-descending', path: 'M10 4v12M5 11l5 5 5-5' };
export const SortNoneIcon: IconDefinition = { name: 'sort-none', path: 'M6 8l4-4 4 4M6 12l4 4 4-4' };
export const PlusIcon: IconDefinition = { name: 'plus', path: 'M10 4v12M4 10h12' };
export const MinusIcon: IconDefinition = { name: 'minus', path: 'M4 10h12' };
export const SearchIcon: IconDefinition = { name: 'search', path: 'M9 15a6 6 0 100-12 6 6 0 000 12zM13.5 13.5L17 17' };
export const MenuIcon: IconDefinition = { name: 'menu', path: 'M3 5h14M3 10h14M3 15h14' };
export const MoreIcon: IconDefinition = {
  name: 'more',
  path: 'M5 11a1 1 0 100-2 1 1 0 000 2zM10 11a1 1 0 100-2 1 1 0 000 2zM15 11a1 1 0 100-2 1 1 0 000 2z',
};
export const EyeIcon: IconDefinition = {
  name: 'eye',
  path: 'M1.5 10C3.5 6.5 6.5 4.5 10 4.5s6.5 2 8.5 5.5c-2 3.5-5 5.5-8.5 5.5S3.5 13.5 1.5 10zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
};
export const EyeOffIcon: IconDefinition = {
  name: 'eye-off',
  path: 'M1.5 10C3.5 6.5 6.5 4.5 10 4.5s6.5 2 8.5 5.5c-2 3.5-5 5.5-8.5 5.5S3.5 13.5 1.5 10zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 3.5l13 13',
};
export const CalendarIcon: IconDefinition = { name: 'calendar', path: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v4M13 3v4' };

// Actions
export const DownloadIcon: IconDefinition = { name: 'download', path: 'M10 3v10M5.5 8.5L10 13l4.5-4.5M4 16h12' };
export const UploadIcon: IconDefinition = { name: 'upload', path: 'M10 13V3M5.5 7.5L10 3l4.5 4.5M4 16h12' };
export const CopyIcon: IconDefinition = { name: 'copy', path: 'M7 7h9.5v9.5H7zM13 7V3.5H3.5V13H7' };
export const EditIcon: IconDefinition = { name: 'edit', path: 'M13.5 3.5l3 3L7 16H4v-3zM11.5 5.5l3 3' };
export const ArchiveIcon: IconDefinition = { name: 'archive', path: 'M3 4h14v3.5H3zM4.5 7.5v9h11v-9M8 11h4' };
export const RetryIcon: IconDefinition = { name: 'retry', path: 'M16 10a6 6 0 11-1.8-4.3M16 3v3.5h-3.5' };
export const SendIcon: IconDefinition = { name: 'send', path: 'M3 10l14-6.5-5 14-2.5-5.5zM9.5 12L17 3.5' };
export const AttachIcon: IconDefinition = {
  name: 'attach',
  path: 'M15.5 9.5l-5.8 5.8a3.5 3.5 0 01-5-5l6.3-6.3a2.3 2.3 0 013.3 3.3l-6.2 6.2a1.2 1.2 0 01-1.7-1.7l5.6-5.6',
};

// Places (navigation)
export const HomeIcon: IconDefinition = { name: 'home', path: 'M3 9.5L10 3l7 6.5M5 8v9h10V8M8.5 17v-5h3v5' };
export const InboxIcon: IconDefinition = { name: 'inbox', path: 'M3 11l2.5-7h9l2.5 7v5.5H3zM3 11h4l1 2h4l1-2h4' };
export const FileIcon: IconDefinition = { name: 'file', path: 'M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5' };
export const UsersIcon: IconDefinition = {
  name: 'users',
  path: 'M7.5 9a3 3 0 100-6 3 3 0 000 6zM2 17a5.5 5.5 0 0111 0M13 3.3a3 3 0 010 5.4M15 11.8A5.5 5.5 0 0118 17',
};
export const BuildingIcon: IconDefinition = { name: 'building', path: 'M4.5 17.5v-14h8v14M12.5 8h3v9.5M2.5 17.5h15M7 6.5h3M7 9.5h3M7 12.5h3' };
export const SettingsIcon: IconDefinition = { name: 'settings', path: 'M3 6h14M3 14h14M7 3.5v5M13 11.5v5' };
export const ShieldIcon: IconDefinition = { name: 'shield', path: 'M10 2.5l6 2.5v5c0 3.5-2.5 6-6 7.5-3.5-1.5-6-4-6-7.5V5z' };

// Data
export const TrendUpIcon: IconDefinition = { name: 'trend-up', path: 'M3 14l5-5 3 3 6-6M12 6h5v5' };
export const TrendDownIcon: IconDefinition = { name: 'trend-down', path: 'M3 6l5 5 3-3 6 6M12 14h5v-5' };

// AI patterns: the sparkle marks AI (and only AI); the rest are chat and feedback actions.
export const SparkleIcon: IconDefinition = {
  name: 'sparkle',
  path: 'M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4L4 8.5l4.4-1.6zM15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
};
export const StopIcon: IconDefinition = { name: 'stop', path: 'M6 6h8v8H6z' };
export const ThumbsUpIcon: IconDefinition = { name: 'thumbs-up', path: 'M6.5 9v8h-3V9zM6.5 9l3-6c1.4 0 2 1 2 2.2V8h4a1.5 1.5 0 011.5 1.8l-1.2 5.5a2 2 0 01-2 1.7H6.5' };
export const ThumbsDownIcon: IconDefinition = {
  name: 'thumbs-down',
  path: 'M6.5 11V3h-3v8zM6.5 11l3 6c1.4 0 2-1 2-2.2V12h4a1.5 1.5 0 001.5-1.8l-1.2-5.5a2 2 0 00-2-1.7H6.5',
};
