import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Toast.css';

export type ToastTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: 'info',
};

export interface ToastProps extends EscapeHatch {
  /** Short message, always visible. Required. */
  title: string;
  description?: string;
  /** Tone with an icon, never colour alone. danger and warning are announced assertively. */
  tone?: ToastTone;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Auto-dismiss delay in ms. Infinity keeps it open (use for anything the user must act on). */
  duration?: number;
  /** Label of the dismiss button. */
  closeLabel?: string;
}

/** Declarative toast. Render inside a ToastProvider, or use the useToast() hook. */
export function Toast({ title, description, tone = 'neutral', closeLabel = 'Dismiss', UNSAFE_className, UNSAFE_style, ...rootProps }: ToastProps) {
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <ToastPrimitive.Root
      {...rootProps}
      type={urgent ? 'foreground' : 'background'}
      className={cx('toast', UNSAFE_className)}
      style={UNSAFE_style}
      data-tone={tone}
    >
      <span className="toast__icon">
        <Icon name={TONE_ICON[tone]} size="md" />
      </span>
      <div className="toast__text">
        <ToastPrimitive.Title className="toast__title">{title}</ToastPrimitive.Title>
        {description ? <ToastPrimitive.Description className="toast__description">{description}</ToastPrimitive.Description> : null}
      </div>
      <ToastPrimitive.Close className="toast__close" aria-label={closeLabel}>
        <Icon name="close" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

type ToastInput = Omit<ToastProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'UNSAFE_className' | 'UNSAFE_style'>;

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Accessible label of the notifications region. */
  label?: string;
}

/** Hosts the toast viewport and the queue used by useToast(). Mount once near the app root. */
export function ToastProvider({ children, label = 'Notifications' }: ToastProviderProps) {
  const [queue, setQueue] = useState<(ToastInput & { id: number })[]>([]);
  const push = useCallback((toast: ToastInput) => {
    setQueue((current) => [...current, { ...toast, id: Date.now() + current.length }]);
  }, []);
  const remove = (id: number) => setQueue((current) => current.filter((t) => t.id !== id));
  return (
    <ToastContext value={push}>
      <ToastPrimitive.Provider label={label} swipeDirection="right">
        {children}
        {queue.map(({ id, ...toast }) => (
          <Toast key={id} {...toast} defaultOpen onOpenChange={(open) => (open ? undefined : remove(id))} />
        ))}
        <ToastPrimitive.Viewport className="toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}

/** Imperative API: const toast = useToast(); toast({ title: 'Saved', tone: 'success' }). */
export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast() must be used inside <ToastProvider>');
  return useMemo(() => push, [push]);
}
