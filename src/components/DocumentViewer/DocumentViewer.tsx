import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { DocumentScopeContext, useDocumentIndex } from '../Clause/documentIndex';
import type { HeadingLevel } from '../Heading/Heading';
import { CopyIcon, EditIcon } from '../Icon/icons';
import { useShortcut } from '../Shortcuts/Shortcuts';
import { Toolbar, ToolbarButton } from '../Toolbar/Toolbar';
import './DocumentViewer.css';

interface ViewerContext {
  announce: (message: string) => void;
}

const DocumentContext = createContext<ViewerContext>({ announce: () => undefined });

/** The text the reader selected in the document, and the range it covers (to store as a highlight). */
export interface DocumentSelection {
  text: string;
  range: Range;
}

export interface DocumentViewerProps extends EscapeHatch {
  /** The document's name: labels the document region ("Master services agreement"). Required. */
  label: string;
  /** The generated document: headings and paragraphs, with DataField and Highlight inside. */
  children: ReactNode;
  /**
   * Called with the reader's selection when they choose Highlight (from the menu above a selection,
   * or with H while text in the document is selected). Store it and render it as a Highlight (the
   * default tone). Without it, selecting text is plain native selection with no menu.
   */
  onHighlight?: (selection: DocumentSelection) => void;
  /** The outline level of a top-level Clause's heading; sub-clauses go one deeper. Default 2 (under the page's h1). */
  headingLevel?: Exclude<HeadingLevel, 1>;
}

/** The keys that highlight the selection: shown in the menu, registered only while there is one. */
const HIGHLIGHT_KEYS = 'h';

/** Registers H while the reader has text selected in this viewer, so only one viewer holds it. */
function HighlightShortcut({ onPress }: { onPress: () => void }) {
  useShortcut({ id: 'document.highlight', keys: HIGHLIGHT_KEYS, description: 'Highlight the selection', scope: 'Document', handler: onPress });
  return null;
}

interface MenuState extends DocumentSelection {
  rect: DOMRect;
}

/**
 * A document the app generates from data, shown as one continuous sheet (at least a page tall) on a
 * canvas, with, when `onHighlight` is set, a menu above the reader's selection. The viewer is the
 * document area only: the page around it holds any toolbar (Find, Download).
 * Selecting is the browser's own (::selection is not styled); fields and placeholders are not
 * part of a selection. Placeholders that fill in place are announced in a polite live region.
 */
export function DocumentViewer({
  label,
  children,
  onHighlight,
  headingLevel = 2,
  UNSAFE_className,
  UNSAFE_style,
}: DocumentViewerProps) {
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const paper = useRef<HTMLElement>(null);
  const scope = useId();
  const index = useDocumentIndex(paper);
  const documentScope = useMemo(() => ({ scope, headingLevel, index }), [scope, headingLevel, index]);

  const announce = useCallback((text: string) => setMessage(text), []);
  const context = useMemo(() => ({ announce }), [announce]);

  /** The selection, if it is non-empty and inside the paper. */
  const readSelection = useCallback((): DocumentSelection | null => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !paper.current) return null;
    const range = selection.getRangeAt(0);
    if (!paper.current.contains(range.commonAncestorContainer)) return null;
    const text = selection.toString().trim();
    return text ? { text, range: range.cloneRange() } : null;
  }, []);

  useEffect(() => {
    if (!onHighlight) return undefined;
    const update = () => {
      const found = readSelection() !== null;
      setHasSelection(found);
      if (!found) setMenu(null);
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [onHighlight, readSelection]);

  /** When a selection ends (pointer up, or Shift + arrows released), offer the menu above it. */
  const selectionEnded = () => {
    if (!onHighlight) return;
    const found = readSelection();
    setHasSelection(found !== null);
    setMenu(found ? { ...found, rect: found.range.getBoundingClientRect() } : null);
  };

  const highlight = (selection: DocumentSelection | null) => {
    if (!selection || !onHighlight) return;
    onHighlight(selection);
    announce('Highlighted');
    window.getSelection()?.removeAllRanges();
    setMenu(null);
    setHasSelection(false);
  };

  const copy = (selection: DocumentSelection | null) => {
    if (!selection) return;
    void navigator.clipboard?.writeText(selection.text);
    setMenu(null);
  };

  return (
    <DocumentContext.Provider value={context}>
      <div className={cx('document-viewer', UNSAFE_className)} style={UNSAFE_style}>
        {onHighlight && hasSelection ? <HighlightShortcut onPress={() => highlight(readSelection())} /> : null}
        <div className="document-viewer__canvas">
          <article ref={paper} className="document-viewer__paper" aria-label={label} onMouseUp={selectionEnded} onKeyUp={(event) => event.shiftKey && selectionEnded()}>
            <DocumentScopeContext value={documentScope}>{children}</DocumentScopeContext>
          </article>
        </div>
        <span className="visually-hidden" aria-live="polite">
          {message}
        </span>
        {onHighlight ? (
          <PopoverPrimitive.Root open={menu !== null} onOpenChange={(open) => !open && setMenu(null)}>
            <PopoverPrimitive.Anchor virtualRef={{ current: { getBoundingClientRect: () => menu?.rect ?? new DOMRect() } }} />
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                className="document-viewer__menu"
                side="top"
                sideOffset={4}
                aria-label="Selection actions"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <Toolbar label="Selection actions">
                  <ToolbarButton icon={EditIcon} shortcut={HIGHLIGHT_KEYS} onClick={() => highlight(menu)}>
                    Highlight
                  </ToolbarButton>
                  <ToolbarButton icon={CopyIcon} onClick={() => copy(menu)}>
                    Copy
                  </ToolbarButton>
                </Toolbar>
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        ) : null}
      </div>
    </DocumentContext.Provider>
  );
}

export interface DataFieldProps {
  /** The merged value, as the reader should see it (format it with useFormat first). Empty → blank. */
  value?: string | null | undefined;
  /** For a value that fills later (a signer's name, the date signed, an effective date set by a rule): shown until it does. */
  placeholder?: string;
  /** What to call it when it fills, for the live region: "Effective date" → “Effective date filled: 14 October 2026”. */
  announceAs?: string;
}

/**
 * A value merged into a generated document from data. Filled, it is plain document text; empty, it
 * is blank (the form that collected it validates it). A placeholder fills in place, briefly tinted.
 */
export function DataField({ value, placeholder, announceAs }: DataFieldProps) {
  const { announce } = useContext(DocumentContext);
  const filled = Boolean(value);
  const wasFilled = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      setJustFilled(true);
      if (announceAs) announce(`${announceAs} filled: ${value ?? ''}`);
    }
    wasFilled.current = filled;
  }, [filled, value, announceAs, announce]);

  if (filled) {
    return (
      <span className="document-data" data-state={justFilled ? 'filled-now' : undefined} onAnimationEnd={() => setJustFilled(false)}>
        {value}
      </span>
    );
  }
  if (placeholder) {
    return (
      <span className="document-data" data-state="placeholder">
        {placeholder}
      </span>
    );
  }
  return null;
}
