import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import './DocumentHeader.css';

/** Which printed pages a running header or footer appears on. */
export type RunningPages = 'all' | 'first' | 'rest';

/** A CSS string for a custom property: the text, quoted and escaped, as @page content reads it. */
const cssString = (text: string) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()}"`;

/**
 * Hands the running text to the print stylesheet's page margin boxes (Document.css): they can only
 * show strings and counters, so the text goes through custom properties on the root, one for the
 * first page and one for the rest. One document prints at a time; the last one rendered wins.
 */
function useRunning(kind: 'header' | 'footer', pages: RunningPages, ref: RefObject<HTMLElement | null>, suffix: string) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const root = element.ownerDocument.documentElement.style;
    const value = [cssString(element.textContent ?? ''), suffix].filter(Boolean).join(' ');
    const first = `--document-${kind}-first`;
    const rest = `--document-${kind}-rest`;
    if (pages !== 'rest') root.setProperty(first, value);
    if (pages !== 'first') root.setProperty(rest, value);
    return () => {
      root.removeProperty(first);
      root.removeProperty(rest);
    };
  });
}

export interface DocumentHeaderProps {
  /** Which printed pages it runs on. Default all. */
  pages?: RunningPages;
  /** The running text ("Master Services Agreement · Confidential"). Text only: print shows it as a string. */
  children: ReactNode;
}

/**
 * A running header: on screen, a line above the document; in print, the top margin of each page
 * it runs on (`pages`: all, first, or every page but the first).
 */
export function DocumentHeader({ pages = 'all', children }: DocumentHeaderProps) {
  const ref = useRef<HTMLElement>(null);
  useRunning('header', pages, ref, '');
  return (
    <header ref={ref} className="document-header" data-doc="header" data-pages={pages}>
      {children}
    </header>
  );
}

export interface DocumentFooterProps {
  /** Which printed pages it runs on. Default all. */
  pages?: RunningPages;
  /** Adds the page number in print: “Page 2”, or with `of`, “Page 2 of 5”. */
  pageNumber?: 'page' | 'of';
  /** The running text, if any ("Acme Corp · MSA v3.2"). Text only. */
  children?: ReactNode;
}

/**
 * A running footer: on screen, a line below the document; in print, the bottom margin of each page
 * it runs on, with the page number when asked (`pageNumber`, from the page counter).
 */
export function DocumentFooter({ pages = 'all', pageNumber, children }: DocumentFooterProps) {
  const ref = useRef<HTMLElement>(null);
  const counter = pageNumber === 'of' ? '"Page " counter(page) " of " counter(pages)' : pageNumber ? '"Page " counter(page)' : '';
  useRunning('footer', pages, ref, children && counter ? `"\\00a0·\\00a0" ${counter}` : counter);
  return (
    <footer ref={ref} className="document-footer" data-doc="footer" data-pages={pages}>
      {children}
    </footer>
  );
}
