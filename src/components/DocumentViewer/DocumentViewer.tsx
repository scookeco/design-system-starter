import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { AnnounceContext } from '../Document/data';
import { CopyIcon, EditIcon } from '../Icon/icons';
import { useShortcut } from '../Shortcuts/Shortcuts';
import { Toolbar, ToolbarButton } from '../Toolbar/Toolbar';
import './DocumentViewer.css';

/** The text the reader selected in the document, and the range it covers (to store as a highlight). */
export interface DocumentSelection {
  text: string;
  range: Range;
}

export interface DocumentViewerProps extends EscapeHatch {
  /** The one Document to show: its clauses and paragraphs, with DocumentField and Highlight inside. Required. */
  children: ReactNode;
  /**
   * Called with the reader's selection when they choose Highlight (from the menu above a selection,
   * or with H while text in the document is selected). Store it and render it as a Highlight (the
   * default tone). Without it, selecting text is plain native selection with no menu.
   */
  onHighlight?: (selection: DocumentSelection) => void;
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
 * Shows one Document on screen: a flow document as one continuous sheet (at least a page tall) on a
 * canvas, a grid document as its fixed pages, with, when `onHighlight` is set, a menu above the
 * reader's selection. The viewer is the screen render target and its review tools only; the Document
 * inside holds the content and numbering, and prints without it. The page around it holds any
 * toolbar (Find, Download).
 * Selecting is the browser's own (::selection is not styled); fields and placeholders are not
 * part of a selection. Fields that fill in place (DocumentField announceAs) are announced in a polite live region.
 */
export function DocumentViewer({ children, onHighlight, UNSAFE_className, UNSAFE_style }: DocumentViewerProps) {
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const paper = useRef<HTMLDivElement>(null);

  const announce = useCallback((text: string) => setMessage(text), []);

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
    <AnnounceContext value={announce}>
      <div className={cx('document-viewer', UNSAFE_className)} style={UNSAFE_style}>
        {onHighlight && hasSelection ? <HighlightShortcut onPress={() => highlight(readSelection())} /> : null}
        <div className="document-viewer__canvas">
          <div ref={paper} className="document-viewer__paper" onMouseUp={selectionEnded} onKeyUp={(event) => event.shiftKey && selectionEnded()}>
            {children}
          </div>
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
    </AnnounceContext>
  );
}
