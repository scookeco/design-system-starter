/**
 * The chat page's URL: /assistant?c=c-3. The open conversation lives in the query string, so a link
 * reopens it and switching conversations doesn't remount the page (routes key pages by path).
 */
import type { UrlCodec } from './useUrlState';

export interface ChatUrlState {
  /** The open conversation's id, or '' for a new chat. */
  c: string;
}

export const chatCodec: UrlCodec<ChatUrlState> = {
  parse: (search) => {
    const c = new URLSearchParams(search).get('c') ?? '';
    return { c: /^c-\d+$/.test(c) ? c : '' };
  },
  serialise: ({ c }) => (c ? new URLSearchParams({ c }).toString() : ''),
};
