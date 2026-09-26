import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../../components/Button/Button';
import { Drawer } from '../../components/Drawer/Drawer';
import './AssistantPanel.css';

const DEFAULT_STORAGE_KEY = 'assistant-panel.width';
/** Keyboard resize steps, in CSS pixels: an arrow, and Shift with an arrow. */
const STEP = 16;
const BIG_STEP = 64;

/** Storage can be missing or throw (private windows, blocked site data): remembering is best effort. */
const readWidth = (key: string | null): number | undefined => {
  if (key === null) return undefined;
  try {
    const stored = Number(window.localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? stored : undefined;
  } catch {
    return undefined;
  }
};

const writeWidth = (key: string | null, width: number) => {
  if (key === null) return;
  try {
    window.localStorage.setItem(key, String(Math.round(width)));
  } catch {
    // Not remembered this time; the resize still applies.
  }
};

/** A size token's value in CSS pixels ("20rem" → 320), read from the element's computed style. */
const tokenPx = (el: Element, name: string, fallback: number) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return value.endsWith('rem') ? n * rem : n;
};

interface Bounds {
  min: number;
  max: number;
  initial: number;
}

export interface AssistantPanelProps extends EscapeHatch {
  /** The assistant's name: the panel's landmark name and heading, the drawer's title ("Assistant"). Required. */
  title: string;
  /** The conversation: a ChatThread over a Composer, laid out to fill the panel. */
  children: ReactNode;
  /** Controlled: the panel is open beside the page (wide) or in its drawer (narrow). */
  open?: boolean;
  /** Uncontrolled starting state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Label of the button that opens it (a launcher at the edge when wide, in the header when narrow). */
  launcherLabel?: string;
  /** Actions in the panel's header, before Close: New chat, a History menu. */
  actions?: ReactNode;
  /**
   * localStorage key under which the width a person chose is remembered across visits. null turns
   * remembering off (gallery and tests).
   */
  storageKey?: string | null;
  /** Accessible name of the resize handle. */
  resizeLabel?: string;
  closeLabel?: string;
  /** Start with the narrow-screen drawer open (gallery and tests). */
  defaultDrawerOpen?: boolean;
}

/**
 * The assistant beside the page, in AppShell's `assistant` slot. Wide, it is a panel at the inline
 * end that the person resizes (drag the edge, arrow keys on it, or Widen / Narrow) and closes to a
 * launcher; the width is remembered. Narrow, it gives way to a launcher in the header that opens the
 * same content in a Drawer. The content is mounted in one place at a time.
 */
export function AssistantPanel({
  title,
  children,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  launcherLabel = title,
  actions,
  storageKey = DEFAULT_STORAGE_KEY,
  resizeLabel = `Resize ${title.toLowerCase()} panel`,
  closeLabel = 'Close',
  defaultDrawerOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: AssistantPanelProps) {
  const id = useId();
  const panelId = `${id}-panel`;
  const headingId = `${id}-title`;
  const dock = useRef<HTMLElement>(null);
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = controlledOpen ?? ownOpen;
  const [drawerOpen, setDrawerOpen] = useState(defaultDrawerOpen);
  const launcher = useRef<HTMLButtonElement>(null);
  // Where focus goes after the person opens or closes the panel, so it never falls to the page.
  const focusAfter = useRef<'panel' | 'launcher' | undefined>(undefined);
  const [width, setWidth] = useState(() => readWidth(storageKey));
  const [bounds, setBounds] = useState<Bounds>({ min: 320, max: 576, initial: 384 });
  const drag = useRef<{ x: number; width: number } | undefined>(undefined);

  const setOpen = (next: boolean) => {
    focusAfter.current = next ? 'panel' : 'launcher';
    if (controlledOpen === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (focusAfter.current === 'panel') dock.current?.focus();
    if (focusAfter.current === 'launcher') launcher.current?.focus();
    focusAfter.current = undefined;
  }, [open]);

  // The resize range comes from the size.assistant tokens, as the browser resolved them.
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    setBounds({
      min: tokenPx(el, '--size-assistant-min', 320),
      max: tokenPx(el, '--size-assistant-max', 576),
      initial: tokenPx(el, '--size-assistant-default', 384),
    });
  }, [open]);

  const current = Math.min(bounds.max, Math.max(bounds.min, width ?? bounds.initial));
  const resize = (next: number, remember = true) => {
    const clamped = Math.round(Math.min(bounds.max, Math.max(bounds.min, next)));
    setWidth(clamped);
    if (remember) writeWidth(storageKey, clamped);
  };

  // The panel sits at the inline end, so moving the edge toward the inline start widens it.
  const rtl = () => (dock.current ? getComputedStyle(dock.current).direction === 'rtl' : false);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const widen = rtl() ? 'ArrowRight' : 'ArrowLeft';
    const narrow = rtl() ? 'ArrowLeft' : 'ArrowRight';
    const next = { [widen]: current + step, [narrow]: current - step, Home: bounds.min, End: bounds.max }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    resize(next);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width: current };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = (event.clientX - drag.current.x) * (rtl() ? 1 : -1);
    resize(drag.current.width + delta, false);
  };
  const onPointerUp = () => {
    if (drag.current) writeWidth(storageKey, current);
    drag.current = undefined;
  };

  const wide = current >= bounds.max;
  const widthStyle = (width === undefined ? {} : { '--assistant-panel-width': `${String(current)}px` }) as CSSProperties;
  return (
    <div className={cx('assistant-panel', UNSAFE_className)} style={UNSAFE_style}>
      {open ? (
        <aside ref={dock} className="assistant-panel__dock" id={panelId} aria-labelledby={headingId} tabIndex={-1} style={widthStyle}>
          <div
            className="assistant-panel__handle"
            role="separator"
            aria-orientation="vertical"
            aria-label={resizeLabel}
            aria-controls={panelId}
            aria-valuenow={current}
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-drag-alternative="The Widen / Narrow button in the panel header, and the arrow keys on this handle"
          />
          <div className="assistant-panel__header">
            <h2 className="assistant-panel__title" id={headingId}>
              {title}
            </h2>
            <div className="assistant-panel__actions">
              {actions}
              <Button variant="ghost" size="sm" onClick={() => resize(wide ? bounds.initial : bounds.max)}>
                {wide ? 'Narrow' : 'Widen'}
              </Button>
              <Button variant="ghost" size="sm" icon="close" onClick={() => setOpen(false)}>
                {closeLabel}
              </Button>
            </div>
          </div>
          {/* Mounted in one place at a time: while the narrow-screen drawer is open, the content lives there. */}
          <div className="assistant-panel__body">{drawerOpen ? null : children}</div>
        </aside>
      ) : (
        <div className="assistant-panel__rail">
          <Button ref={launcher} variant="secondary" size="sm" icon="sparkle" aria-expanded={false} onClick={() => setOpen(true)}>
            {launcherLabel}
          </Button>
        </div>
      )}
      <div className="assistant-panel__narrow">
        <Drawer
          title={title}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          trigger={
            <Button variant="secondary" size="sm" icon="sparkle">
              {launcherLabel}
            </Button>
          }
        >
          <div className="assistant-panel__drawer-body">{children}</div>
        </Drawer>
      </div>
    </div>
  );
}
