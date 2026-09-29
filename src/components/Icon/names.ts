/*
 * Every icon by its name: the Foundations page's list. Internal, and not exported from
 * src/index.ts: looking an icon up by name bundles the whole set, so components take the value
 * (Guides/Contributing tells how the old name-based API was retired). A unit test keeps it in step
 * with ./icons.ts.
 */
import * as icon from './icons';
import type { IconDefinition } from './icons';

/** Every icon, keyed by name, in the set's order. */
export const iconsByName = {
  check: icon.CheckIcon,
  success: icon.SuccessIcon,
  warning: icon.WarningIcon,
  danger: icon.DangerIcon,
  info: icon.InfoIcon,
  close: icon.CloseIcon,
  'chevron-down': icon.ChevronDownIcon,
  'chevron-right': icon.ChevronRightIcon,
  'chevron-left': icon.ChevronLeftIcon,
  'sort-ascending': icon.SortAscendingIcon,
  'sort-descending': icon.SortDescendingIcon,
  'sort-none': icon.SortNoneIcon,
  plus: icon.PlusIcon,
  minus: icon.MinusIcon,
  search: icon.SearchIcon,
  menu: icon.MenuIcon,
  more: icon.MoreIcon,
  eye: icon.EyeIcon,
  'eye-off': icon.EyeOffIcon,
  calendar: icon.CalendarIcon,
  download: icon.DownloadIcon,
  upload: icon.UploadIcon,
  copy: icon.CopyIcon,
  edit: icon.EditIcon,
  archive: icon.ArchiveIcon,
  retry: icon.RetryIcon,
  send: icon.SendIcon,
  attach: icon.AttachIcon,
  home: icon.HomeIcon,
  inbox: icon.InboxIcon,
  file: icon.FileIcon,
  users: icon.UsersIcon,
  building: icon.BuildingIcon,
  settings: icon.SettingsIcon,
  shield: icon.ShieldIcon,
  'trend-up': icon.TrendUpIcon,
  'trend-down': icon.TrendDownIcon,
  sparkle: icon.SparkleIcon,
  stop: icon.StopIcon,
  'thumbs-up': icon.ThumbsUpIcon,
  'thumbs-down': icon.ThumbsDownIcon,
} as const satisfies Record<string, IconDefinition>;
