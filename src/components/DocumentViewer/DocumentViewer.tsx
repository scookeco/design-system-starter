import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import {
  AttachIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  EditIcon,
  FileIcon,
  SearchIcon,
  UsersIcon,
  type IconDefinition,
} from '../Icon/icons';
import { Popover } from '../Popover/Popover';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { Toolbar, ToolbarButton } from '../Toolbar/Toolbar';
import './DocumentViewer.css';

/** Which highlights show. One layer at a time, so a colour always means one thing. */
export type HighlightLayer = 'yours' | 'search' | 'ai';

const LAYERS: readonly { value: HighlightLayer; label: string }[] = [
  { value: 'yours', label: 'Yours' },
  { value: 'search', label: 'Search' },
  { value: 'ai', label: 'AI' },
];

interface ViewerContext {
  layer: HighlightLayer | undefined;
  announce: (message: string) => void;
}

const DocumentContext = createContext<ViewerContext>({ layer: undefined, announce: () => undefined });

/** The text the reader selected in the document, and the range it covers (to store as a highlight). */
export interface DocumentSelection {
  text: string;
  range: Range;
}

export interface DocumentViewerProps extends EscapeHatch {
  /** The document's name: labels the document region ("Master services agreement"). Required. */
  label: string;
  /** The generated document: headings and paragraphs, with DataField, Highlight and DocumentField inside. */
  children: ReactNode;
  /** The highlight layer shown (controlled). Yours = the reader's highlights, Search = Find matches, AI = what an answer cites. */
  layer?: HighlightLayer;
  /** The layer shown first when uncontrolled. */
  defaultLayer?: HighlightLayer;
  onLayerChange?: (layer: HighlightLayer) => void;
  /**
   * Called with the reader's selection when they choose Highlight (from the menu above a selection,
   * or the toolbar's Highlight button). Store it and render it as a Highlight with tone="yours".
   * Without it, selecting text is plain native selection with no menu.
   */
  onHighlight?: (selection: DocumentSelection) => void;
  /** More controls at the end of the viewer's toolbar: Find in document, Download. */
  toolbar?: ReactNode;
}

interface MenuState extends DocumentSelection {
  rect: DOMRect;
}

/**
 * A document the app generates from data, shown as one continuous sheet on a canvas, with a
 * highlight-layer switch and, when `onHighlight` is set, a menu above the reader's selection.
 * Selecting is the browser's own (::selection is not styled); fields and placeholders are not
 * part of a selection. Placeholders that fill in place are announced in a polite live region.
 */
export function DocumentViewer({
  label,
  children,
  layer: layerProp,
  defaultLayer = 'yours',
  onLayerChange,
  onHighlight,
  toolbar,
  UNSAFE_className,
  UNSAFE_style,
}: DocumentViewerProps) {
  const [uncontrolledLayer, setUncontrolledLayer] = useState<HighlightLayer>(defaultLayer);
  const layer = layerProp ?? uncontrolledLayer;
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const paper = useRef<HTMLElement>(null);

  const announce = useCallback((text: string) => setMessage(text), []);
  const context = useMemo(() => ({ layer, announce }), [layer, announce]);

  const changeLayer = (value: string) => {
    const next = value as HighlightLayer;
    if (layerProp === undefined) setUncontrolledLayer(next);
    onLayerChange?.(next);
  };

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
        <div className="document-viewer__toolbar">
          <SegmentedControl label="Highlights" hideLabel options={LAYERS} value={layer} onValueChange={changeLayer} />
          {onHighlight ? (
            <Toolbar label="Selection">
              <ToolbarButton icon={EditIcon} disabled={!hasSelection} onClick={() => highlight(readSelection())}>
                Highlight
              </ToolbarButton>
            </Toolbar>
          ) : null}
          {toolbar ? <div className="document-viewer__extra">{toolbar}</div> : null}
        </div>
        <div className="document-viewer__canvas">
          <article ref={paper} className="document-viewer__paper" aria-label={label} onMouseUp={selectionEnded} onKeyUp={(event) => event.shiftKey && selectionEnded()}>
            {children}
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
                  <ToolbarButton icon={EditIcon} onClick={() => highlight(menu)}>
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

export interface HighlightProps {
  /** Which layer it belongs to. It shows only while the viewer shows that layer; otherwise it is plain text. */
  tone: HighlightLayer;
  /** The current target (from Find's next, a citation, the outline): stronger, and aria-current. */
  current?: boolean;
  /** For linking to it (a citation's target, the outline). */
  id?: string;
  children: ReactNode;
}

/**
 * A highlighted passage in a DocumentViewer: a <mark> with a rounded background that reaches just
 * past its text. Background only, no outline or underline, so every highlight should also be
 * listed somewhere the reader can reach without seeing colour (an outline, Find's results).
 */
export function Highlight({ tone, current = false, id, children }: HighlightProps) {
  const { layer } = useContext(DocumentContext);
  if (layer !== undefined && layer !== tone) return <span id={id}>{children}</span>;
  return (
    <mark className="document-highlight" data-tone={tone} id={id} aria-current={current ? 'true' : undefined}>
      {children}
    </mark>
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

export type DocumentFieldKind =
  | 'signature'
  | 'initials'
  | 'date-signed'
  | 'stamp'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'combobox'
  | 'multi-select'
  | 'attachment'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider';

/** Who a field belongs to. `category` (1–6, color.category.*) is that signer's colour, the same everywhere in the document. */
export interface DocumentSigner {
  name: string;
  category: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface DocumentFieldProps {
  kind: DocumentFieldKind;
  /** What the field asks for: "Sign", "Invoice frequency". The tag's text, and its accessible name. */
  label: string;
  signer: DocumentSigner;
  /** Whether the person reading can act on it. Someone else's field is flat (no outline) and not actionable. */
  yours?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** The filled value, shown in place of the label ("Maya Okafor", "Quarterly"). */
  value?: string | undefined;
  /** For checkbox, radio and switch: filled when true. */
  checked?: boolean;
  /** The system control that edits it (TextField, Select, DatePicker…), opened in a popover anchored to the tag. */
  editor?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** For fields completed elsewhere (signature, initials, attachment): the app opens its own flow. */
  onActivate?: () => void;
}

const KIND_ICON: Partial<Record<DocumentFieldKind, IconDefinition>> = {
  signature: EditIcon,
  initials: EditIcon,
  'date-signed': CalendarIcon,
  stamp: BuildingIcon,
  text: EditIcon,
  textarea: FileIcon,
  number: EditIcon,
  date: CalendarIcon,
  combobox: SearchIcon,
  attachment: AttachIcon,
};

const BOXED: readonly DocumentFieldKind[] = ['checkbox', 'radio', 'switch'];

/**
 * A field in a document's text flow: a tag in the signer's colour, inline so it moves with the
 * text. An outline means it is yours to complete. Activating it opens the system's own control
 * (`editor`, in a popover) or the app's flow (`onActivate`). Not part of a text selection.
 */
export function DocumentField({
  kind,
  label,
  signer,
  yours = true,
  required = false,
  invalid = false,
  value,
  checked = false,
  editor,
  open,
  defaultOpen,
  onOpenChange,
  onActivate,
}: DocumentFieldProps) {
  const boxed = BOXED.includes(kind);
  const filled = boxed ? checked : Boolean(value);
  const status = filled ? (value ?? 'checked') : required ? 'required' : 'empty';
  const name = yours ? `${label}, ${status}, ${signer.name}` : `${label}, ${signer.name}’s field`;
  const icon = boxed ? (filled ? (kind === 'checkbox' ? CheckIcon : undefined) : yours ? undefined : UsersIcon) : filled ? undefined : KIND_ICON[kind];
  const trailing = (kind === 'select' || kind === 'multi-select') && !boxed;
  const shown = boxed ? null : (value ?? label);

  const content = (
    <>
      {icon ? <Icon icon={icon} /> : null}
      {kind === 'radio' && filled ? <span className="document-field__dot" /> : null}
      {kind === 'switch' ? <span className="document-field__thumb" /> : null}
      {shown ? <span className="document-field__text">{shown}</span> : null}
      {trailing ? <Icon icon={ChevronDownIcon} /> : null}
    </>
  );

  const attributes = {
    className: 'document-field',
    'data-kind': kind,
    'data-category': String(signer.category),
    'data-filled': filled ? 'true' : undefined,
    'aria-invalid': invalid ? true : undefined,
  } as const;

  if (!yours) {
    return (
      <span {...attributes} data-signer="other" role="img" aria-label={name}>
        {content}
      </span>
    );
  }

  const button = (
    <button type="button" {...attributes} aria-label={name} onClick={editor ? undefined : onActivate}>
      {content}
    </button>
  );
  if (!editor) return button;
  return (
    <Popover label={label} trigger={button} {...(open === undefined ? {} : { open })} {...(defaultOpen === undefined ? {} : { defaultOpen })} {...(onOpenChange ? { onOpenChange } : {})}>
      {editor}
    </Popover>
  );
}
