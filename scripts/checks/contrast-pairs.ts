/**
 * Every foreground/background pair the system promises, with its WCAG 2.2 AA minimum.
 * tests/unit/contrast.test.ts checks each in light and dark; the Foundations colour page shows them.
 * A new text/background pair goes here.
 */

/** WCAG 2.2 AA: 4.5:1 for text, 3:1 for UI components and graphical objects. */
export const TEXT = 4.5;
export const UI = 3;

const SURFACES = ['color.bg.canvas', 'color.bg.surface', 'color.bg.subtle', 'color.bg.elevated'];
const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'];
const CATEGORIES = ['1', '2', '3', '4', '5', '6'];
const HIGHLIGHTS = ['color.highlight.bg', 'color.highlight.search.bg', 'color.highlight.ai.bg'];

export interface ContrastPair {
  fg: string;
  bg: string;
  min: number;
}

export const pairs: ContrastPair[] = [
  ...SURFACES.flatMap((bg) => [
    { fg: 'color.fg.default', bg, min: TEXT },
    { fg: 'color.fg.muted', bg, min: TEXT },
    { fg: 'color.fg.link', bg, min: TEXT },
    { fg: 'color.border.strong', bg, min: UI },
    { fg: 'color.focus', bg, min: UI },
    { fg: 'color.action.primary', bg, min: UI },
    { fg: 'color.action.danger', bg, min: UI },
    ...STATUSES.map((s) => ({ fg: `color.status.${s}.fg`, bg, min: TEXT })),
  ]),
  { fg: 'color.fg.default', bg: 'color.bg.hover', min: TEXT },
  { fg: 'color.fg.muted', bg: 'color.bg.hover', min: TEXT },
  { fg: 'color.fg.default', bg: 'color.bg.selected', min: TEXT },
  { fg: 'color.fg.inverse', bg: 'color.bg.inverse', min: TEXT },
  { fg: 'color.fg.on-action', bg: 'color.action.primary', min: TEXT },
  { fg: 'color.fg.on-action', bg: 'color.action.primary-hover', min: TEXT },
  { fg: 'color.fg.on-danger', bg: 'color.action.danger', min: TEXT },
  { fg: 'color.fg.on-danger', bg: 'color.action.danger-hover', min: TEXT },
  ...STATUSES.map((s) => ({ fg: `color.status.${s}.fg`, bg: `color.status.${s}.bg`, min: TEXT })),
  // Banner: body text and links sit on the tone's background.
  ...STATUSES.map((s) => ({ fg: 'color.fg.default', bg: `color.status.${s}.bg`, min: TEXT })),
  ...STATUSES.map((s) => ({ fg: 'color.fg.link', bg: `color.status.${s}.bg`, min: TEXT })),
  // Categories: the label on its tint and on any surface; the outline of an unfilled one is a boundary (UI).
  ...CATEGORIES.flatMap((c) => [
    { fg: `color.category.${c}.fg`, bg: `color.category.${c}.bg`, min: TEXT },
    { fg: 'color.fg.default', bg: `color.category.${c}.bg`, min: TEXT },
    ...SURFACES.flatMap((bg) => [
      { fg: `color.category.${c}.fg`, bg, min: TEXT },
      { fg: `color.category.${c}.border`, bg, min: UI },
    ]),
  ]),
  // AI marker and AI-generated content: the label and body text on the AI tint, the tint's border on surfaces.
  { fg: 'color.ai.fg', bg: 'color.ai.bg', min: TEXT },
  { fg: 'color.fg.default', bg: 'color.ai.bg', min: TEXT },
  ...SURFACES.map((bg) => ({ fg: 'color.ai.fg', bg, min: TEXT })),
  // Highlight: text on every tone; DataField: a placeholder and the tint it fills with.
  ...HIGHLIGHTS.map((bg) => ({ fg: 'color.fg.default', bg, min: TEXT })),
  { fg: 'color.data-field.fg', bg: 'color.data-field.bg', min: TEXT },
  { fg: 'color.fg.default', bg: 'color.data-field.bg-filled', min: TEXT },
  { fg: 'button.primary.fg', bg: 'button.primary.bg', min: TEXT },
  { fg: 'button.primary.fg', bg: 'button.primary.bg-hover', min: TEXT },
  { fg: 'button.secondary.fg', bg: 'button.secondary.bg', min: TEXT },
  { fg: 'button.secondary.fg', bg: 'button.secondary.bg-hover', min: TEXT },
  { fg: 'button.secondary.border', bg: 'button.secondary.bg', min: UI },
  { fg: 'button.ghost.fg', bg: 'button.ghost.bg-hover', min: TEXT },
  { fg: 'button.danger.fg', bg: 'button.danger.bg', min: TEXT },
  { fg: 'button.danger.fg', bg: 'button.danger.bg-hover', min: TEXT },
];
