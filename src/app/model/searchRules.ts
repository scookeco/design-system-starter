/**
 * What a workspace search matches, and where: one set of rules for the mock server and the page.
 * Matching folds case and accents like `matchesSearch` (the list and the palette), so "garcia"
 * finds "Mateo García" everywhere; the ranges point into the original text, accents included.
 */
import type { SearchType } from '../api/search';
import type { Capability } from '../api/schemas';

/** What a person needs to search each type: the same capability as its list (people are shown on records). */
export const SEARCH_TYPE_CAPABILITY: Record<SearchType, Capability> = { record: 'record:read', account: 'account:read', person: 'record:read' };

/** The fewest characters worth searching for: the palette's rule too. */
export const MIN_QUERY = 2;

const foldChar = (char: string) => char.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Every [start, end) range of `text` that matches `q`, folded, without overlaps. */
export const matchRanges = (text: string, q: string): [number, number][] => {
  const needle = [...q.trim()].map(foldChar).join('');
  if (needle === '') return [];
  let folded = '';
  // For each folded character, the original character's range.
  const origin: [number, number][] = [];
  let offset = 0;
  for (const char of text) {
    const f = foldChar(char);
    for (let k = 0; k < f.length; k += 1) origin.push([offset, offset + char.length]);
    folded += f;
    offset += char.length;
  }
  const ranges: [number, number][] = [];
  let from = 0;
  for (;;) {
    const at = folded.indexOf(needle, from);
    if (at === -1) break;
    const start = origin[at]?.[0] ?? 0;
    const end = origin[at + needle.length - 1]?.[1] ?? text.length;
    ranges.push([start, end]);
    from = at + needle.length;
  }
  return ranges;
};

/** Rank: a title that starts with the query, then one that contains it, then a match on the second line only. */
export const searchScore = (titleMatches: readonly [number, number][], detailMatches: readonly [number, number][]) =>
  titleMatches[0]?.[0] === 0 ? 3 : titleMatches.length > 0 ? 2 : detailMatches.length > 0 ? 1 : 0;

/** Split text into plain and matched parts, in order, for rendering highlights. */
export const highlightParts = (text: string, ranges: readonly [number, number][]) => {
  const parts: { text: string; match: boolean }[] = [];
  let at = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start < at) continue;
    if (start > at) parts.push({ text: text.slice(at, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    at = end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), match: false });
  return parts;
};
