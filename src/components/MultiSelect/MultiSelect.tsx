import { useContext, useRef } from 'react';
import { Button, ComboBox, ComboBoxStateContext, Input, ListBox, Popover } from 'react-aria-components';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { ComboboxEscapeCloses, ComboboxOpenOnMount, PickerHelp, PickerLabel, PickerLocale, PickerOption, usePortalContainer, type PickerOptionData } from '../Picker/Picker';
import { Tag } from '../Tag/Tag';
import './MultiSelect.css';

export type MultiSelectOption = PickerOptionData;

export interface MultiSelectProps extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  hideLabel?: boolean;
  options: readonly MultiSelectOption[];
  /** The chosen values, in the order they were chosen. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Form field name: one value per chosen option is submitted. */
  name?: string;
  emptyMessage?: string;
  showOptionsLabel?: string;
  /** Accessible name of each chip's remove button: `(label) => 'Remove Legal'`. */
  removeLabel?: (label: string) => string;
  /** Render the list open (gallery and tests). */
  defaultOpen?: boolean;
}

/** The chosen values as removable chips, in the field before the input. */
function Chosen({ options, removeLabel }: { options: readonly MultiSelectOption[]; removeLabel: (label: string) => string }) {
  const state = useContext(ComboBoxStateContext);
  const input = useRef<HTMLElement | null>(null);
  if (!state) return null;
  const chosen = (state.value as readonly (string | number)[]).map(String);
  return (
    <>
      {chosen.map((value) => {
        const option = options.find((o) => o.value === value);
        if (!option) return null;
        return (
          <Tag
            key={value}
            removeLabel={removeLabel(option.label)}
            onRemove={() => {
              state.setValue(chosen.filter((v) => v !== value));
              // Removing a chip takes its button away: focus goes to the input, where choosing continues.
              input.current ??= document.activeElement?.closest('.multi-select')?.querySelector('input') ?? null;
              input.current?.focus();
            }}
          >
            {option.label}
          </Tag>
        );
      })}
    </>
  );
}

/**
 * Choosing several values from a list that narrows as you type: tags, teams, event types in a
 * filter. Chosen values show as removable chips in the field; the list stays open while you pick.
 * Behaviour, ARIA and focus come from React Aria's ComboBox in multiple-selection mode.
 */
export function MultiSelect({
  label,
  hideLabel,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  description,
  error,
  size = 'md',
  disabled,
  required,
  name,
  emptyMessage = 'No matches',
  showOptionsLabel = 'Show options',
  removeLabel = (text) => `Remove ${text}`,
  defaultOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: MultiSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { container, ready } = usePortalContainer(ref);
  return (
    <PickerLocale>
      <ComboBox
        ref={ref}
        selectionMode="multiple"
        className={cx('field', 'multi-select', UNSAFE_className)}
        {...(UNSAFE_style ? { style: UNSAFE_style } : {})}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        onChange={(keys) => onValueChange?.(keys.map(String))}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={Boolean(error)}
        name={name}
        menuTrigger="focus"
        allowsEmptyCollection
      >
        <PickerLabel label={label} hideLabel={hideLabel} />
        <div className="field__control picker__control multi-select__control" data-size={size} data-invalid={error ? true : undefined} data-disabled={disabled || undefined}>
          <Chosen options={options} removeLabel={removeLabel} />
          <Input className="picker__input multi-select__input" {...(placeholder ? { placeholder } : {})} />
          <Button className="picker__button" aria-label={showOptionsLabel}>
            <Icon name="chevron-down" />
          </Button>
        </div>
        <PickerHelp description={description} error={error} />
        <Popover className="picker__popover" offset={4} {...(container ? { UNSTABLE_portalContainer: container } : {})}>
          <ListBox className="picker__listbox" renderEmptyState={() => <p className="picker__empty">{emptyMessage}</p>}>
            {options.map((option) => (
              <PickerOption key={option.value} option={option} />
            ))}
          </ListBox>
        </Popover>
        <ComboboxEscapeCloses />
        {defaultOpen ? <ComboboxOpenOnMount ready={ready} /> : null}
      </ComboBox>
    </PickerLocale>
  );
}
