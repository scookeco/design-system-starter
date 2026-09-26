/**
 * Internal: what the React Aria pickers (Combobox, MultiSelect, DatePicker, DateRangePicker,
 * NumberField) share. Their label, description and error use React Aria's own slots, so the
 * control is labelled and described by React Aria's wiring, styled with the Field anatomy's
 * classes, so every form control keeps one structure and spacing.
 *
 * Two integration details live here, so no picker has to remember them:
 *   inside a Dialog   the popover portals into the dialog, not <body>: the dialog's focus trap and
 *                     outside-click handling then treat it as part of the dialog
 *   Escape            closes the open popover, and only the popover: Radix dialogs listen for
 *                     Escape on the document in the capture phase, so the picker takes it first
 */
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ComboBoxStateContext, FieldError, I18nProvider, Label, ListBoxItem, Text } from 'react-aria-components';
import { useFormat } from '../../format';
import { Icon } from '../Icon/Icon';
import '../Field/Field.css';
import './Picker.css';

/**
 * The dialog (or drawer) a picker sits in, if any: its popover portals there. `ready` turns true
 * once that's known (after the first layout), so a picker that starts open waits for it.
 */
export function usePortalContainer(ref: RefObject<Element | null>): { container: Element | undefined; ready: boolean } {
  const [found, setFound] = useState<{ container: Element | undefined; ready: boolean }>({ container: undefined, ready: false });
  useLayoutEffect(() => {
    setFound({ container: ref.current?.closest('[role="dialog"], [role="alertdialog"]') ?? undefined, ready: true });
  }, [ref]);
  return found;
}

/** Open state for a picker that can start open (gallery and tests): it opens once its portal target is known. */
export function useStartOpen(defaultOpen: boolean, ready: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (!defaultOpen || !ready || started.current) return;
    started.current = true;
    setOpen(true);
  }, [defaultOpen, ready]);
  return [open, setOpen];
}

/** While open, Escape closes this popover before anything else hears it (a dialog around it stays open). */
export function useEscapeCloses(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [open, close]);
}

/** Label, description and error through React Aria's slots, in the Field anatomy. */
export function PickerLabel({ label, hideLabel }: { label: string; hideLabel?: boolean | undefined }) {
  return <Label className={hideLabel ? 'field__label visually-hidden' : 'field__label'}>{label}</Label>;
}

export function PickerHelp({ description, error }: { description?: string | undefined; error?: string | undefined }) {
  return (
    <>
      {description ? (
        <Text slot="description" className="field__description">
          {description}
        </Text>
      ) : null}
      <FieldError className="field__error">
        <Icon name="danger" />
        <span>{error}</span>
      </FieldError>
    </>
  );
}

/** React Aria formats and parses with the locale LocaleProvider set: one locale for every format. */
export function PickerLocale({ children }: { children: ReactNode }) {
  const { locale } = useFormat();
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}

/** Opens a combobox's list once its portal target is known (gallery and tests): React Aria's combobox has no open prop. */
export function ComboboxOpenOnMount({ ready }: { ready: boolean }) {
  const state = useContext(ComboBoxStateContext);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !state || !ready) return;
    opened.current = true;
    state.open(null, 'manual');
  }, [state, ready]);
  return null;
}

/** Escape closes a combobox's list and nothing around it. */
export function ComboboxEscapeCloses() {
  const state = useContext(ComboBoxStateContext);
  const close = useCallback(() => state?.close(), [state]);
  useEscapeCloses(state?.isOpen ?? false, close);
  return null;
}

export interface PickerOptionData {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

/** One option: its label, an optional second line, and a check when chosen. */
export function PickerOption({ option }: { option: PickerOptionData }) {
  return (
    <ListBoxItem id={option.value} textValue={option.label} isDisabled={option.disabled ?? false} className="picker__option">
      {({ isSelected }) => (
        <>
          <span className="picker__option-text">
            <span>{option.label}</span>
            {option.description ? <span className="picker__option-description">{option.description}</span> : null}
          </span>
          {isSelected ? (
            <span className="picker__check">
              <Icon name="check" />
            </span>
          ) : null}
        </>
      )}
    </ListBoxItem>
  );
}
