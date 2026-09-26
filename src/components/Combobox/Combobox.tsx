import { useRef } from 'react';
import { Button, ComboBox, Input, ListBox, Popover } from 'react-aria-components';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { ComboboxEscapeCloses, ComboboxOpenOnMount, PickerHelp, PickerLabel, PickerLocale, PickerOption, usePortalContainer } from '../Picker/Picker';
import './Combobox.css';

export interface ComboboxOption {
  value: string;
  label: string;
  /** A second line: an email, a domain, a count. Not matched by typing. */
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  hideLabel?: boolean;
  options: readonly ComboboxOption[];
  /** The chosen option's value, or null for none. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Form field name: the chosen value is submitted. */
  name?: string;
  /** Shown in the list when nothing matches what was typed. */
  emptyMessage?: string;
  /** Accessible name of the button that opens the list. */
  showOptionsLabel?: string;
  /** Render the list open (gallery and tests). */
  defaultOpen?: boolean;
}

/**
 * A text field with a list of options that narrows as you type: choosing one value from many
 * (an owner from 200 people, an account). Typing filters by a locale-aware "contains"; ↑ ↓ move,
 * ↵ chooses, Esc closes. Behaviour, ARIA and focus come from React Aria's ComboBox.
 */
export function Combobox({
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
  defaultOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: ComboboxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { container, ready } = usePortalContainer(ref);
  return (
    <PickerLocale>
      <ComboBox
        ref={ref}
        className={cx('field', 'combobox', UNSAFE_className)}
        {...(UNSAFE_style ? { style: UNSAFE_style } : {})}
        {...(value !== undefined ? { selectedKey: value } : {})}
        {...(defaultValue !== undefined ? { defaultSelectedKey: defaultValue } : {})}
        onSelectionChange={(key) => onValueChange?.(key === null ? null : String(key))}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={Boolean(error)}
        name={name}
        menuTrigger="focus"
        allowsEmptyCollection
      >
        <PickerLabel label={label} hideLabel={hideLabel} />
        <div className="field__control picker__control" data-size={size} data-invalid={error ? true : undefined} data-disabled={disabled || undefined}>
          <Input className="picker__input" {...(placeholder ? { placeholder } : {})} />
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
