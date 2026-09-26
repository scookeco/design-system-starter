import { parseDate, today, type CalendarDate } from '@internationalized/date';
import { useRef, type ReactNode } from 'react';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker as AriaDatePicker,
  DateRangePicker as AriaDateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  RangeCalendar,
} from 'react-aria-components';
import { useFormat } from '../../format';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { PickerHelp, PickerLabel, PickerLocale, useEscapeCloses, usePortalContainer, useStartOpen } from '../Picker/Picker';
import './DatePicker.css';

/** A calendar date as the system passes it: ISO "2026-09-25", no time, no zone. */
export type IsoDate = string;

/** An ISO date string as React Aria's date, or null when it isn't one (an empty or stale value). */
const toDate = (value: IsoDate | null | undefined): CalendarDate | null => {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

interface DateFieldBase extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  hideLabel?: boolean;
  /** Earliest date that can be chosen (ISO). */
  min?: IsoDate;
  /** Latest date that can be chosen (ISO). */
  max?: IsoDate;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Accessible name of the button that opens the calendar. */
  calendarLabel?: string;
  /** Previous and next month buttons. */
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  /** Render the calendar open (gallery and tests). */
  defaultOpen?: boolean;
}

export interface DatePickerProps extends DateFieldBase {
  value?: IsoDate | null;
  defaultValue?: IsoDate | null;
  onValueChange?: (value: IsoDate | null) => void;
  /** Form field name: the ISO date is submitted. */
  name?: string;
}

export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

export interface DateRangePickerProps extends DateFieldBase {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
  /** Form field names for the two ends. */
  startName?: string;
  endName?: string;
}

/**
 * Where the calendar opens when there's no value: today in the time zone LocaleProvider set, not
 * the machine's. (React Aria marks "today" in the grid from the browser's zone; the two differ
 * only for someone whose profile zone isn't where they are, near midnight.)
 */
const useToday = () => today(useFormat().timeZone);

const bounds = (min?: IsoDate, max?: IsoDate) => {
  const minValue = toDate(min);
  const maxValue = toDate(max);
  return { ...(minValue ? { minValue } : {}), ...(maxValue ? { maxValue } : {}) };
};

function CalendarHeader({ previousMonthLabel, nextMonthLabel }: { previousMonthLabel: string; nextMonthLabel: string }) {
  return (
    <header className="date-picker__header">
      <Button slot="previous" className="picker__button" aria-label={previousMonthLabel}>
        <Icon name="chevron-left" />
      </Button>
      <Heading className="date-picker__heading" />
      <Button slot="next" className="picker__button" aria-label={nextMonthLabel}>
        <Icon name="chevron-right" />
      </Button>
    </header>
  );
}

function Grid() {
  return <CalendarGrid className="date-picker__grid">{(date) => <CalendarCell date={date} className="date-picker__cell" />}</CalendarGrid>;
}

function Field({ size, error, disabled, calendarLabel, children }: { size: string; error?: string | undefined; disabled?: boolean | undefined; calendarLabel: string; children: ReactNode }) {
  return (
    <Group className="field__control picker__control date-picker__control" data-size={size} data-invalid={error ? true : undefined} data-disabled={disabled || undefined}>
      {children}
      <Button className="picker__button" aria-label={calendarLabel}>
        <Icon name="chevron-down" />
      </Button>
    </Group>
  );
}

function Segments({ slot }: { slot?: 'start' | 'end' }) {
  return (
    <DateInput className="date-picker__input" {...(slot ? { slot } : {})}>
      {(segment) => <DateSegment segment={segment} className="date-picker__segment" />}
    </DateInput>
  );
}

/**
 * A calendar date: typed segment by segment in the reader's locale order (from LocaleProvider),
 * or picked from a calendar. Values are ISO strings ("2026-09-25"), calendar dates with no zone.
 * Behaviour, ARIA and focus come from React Aria's DatePicker.
 */
export function DatePicker({
  label,
  hideLabel,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  description,
  error,
  size = 'md',
  disabled,
  required,
  name,
  calendarLabel = 'Choose a date',
  previousMonthLabel = 'Previous month',
  nextMonthLabel = 'Next month',
  defaultOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: DatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { container, ready } = usePortalContainer(ref);
  const [open, setOpen] = useStartOpen(defaultOpen, ready);
  useEscapeCloses(open, () => setOpen(false));
  const placeholderValue = useToday();
  return (
    <PickerLocale>
      <AriaDatePicker
        ref={ref}
        className={cx('field', 'date-picker', UNSAFE_className)}
        {...(UNSAFE_style ? { style: UNSAFE_style } : {})}
        {...(value !== undefined ? { value: toDate(value) } : {})}
        {...(defaultValue !== undefined ? { defaultValue: toDate(defaultValue) } : {})}
        onChange={(date) => onValueChange?.(date ? date.toString() : null)}
        {...bounds(min, max)}
        placeholderValue={placeholderValue}
        isOpen={open}
        onOpenChange={setOpen}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={Boolean(error)}
        name={name}
      >
        <PickerLabel label={label} hideLabel={hideLabel} />
        <Field size={size} error={error} disabled={disabled} calendarLabel={calendarLabel}>
          <Segments />
        </Field>
        <PickerHelp description={description} error={error} />
        <Popover className="picker__popover" data-kind="calendar" offset={4} {...(container ? { UNSTABLE_portalContainer: container } : {})}>
          <Dialog className="date-picker__dialog" aria-label={calendarLabel}>
            <Calendar className="date-picker__calendar">
              <CalendarHeader previousMonthLabel={previousMonthLabel} nextMonthLabel={nextMonthLabel} />
              <Grid />
            </Calendar>
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </PickerLocale>
  );
}

/**
 * A range of calendar dates, start to end: typed or picked in one calendar. Values are ISO
 * strings. To filter instants (an audit log's "from" and "to"), turn the range into the start of
 * the first day and the end of the last in the reader's time zone, never UTC midnight.
 */
export function DateRangePicker({
  label,
  hideLabel,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  description,
  error,
  size = 'md',
  disabled,
  required,
  startName,
  endName,
  calendarLabel = 'Choose dates',
  previousMonthLabel = 'Previous month',
  nextMonthLabel = 'Next month',
  defaultOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: DateRangePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { container, ready } = usePortalContainer(ref);
  const [open, setOpen] = useStartOpen(defaultOpen, ready);
  useEscapeCloses(open, () => setOpen(false));
  const placeholderValue = useToday();
  const toRange = (range: DateRange | null | undefined) => {
    const start = toDate(range?.start);
    const end = toDate(range?.end);
    return start && end ? { start, end } : null;
  };
  return (
    <PickerLocale>
      <AriaDateRangePicker
        ref={ref}
        className={cx('field', 'date-picker', UNSAFE_className)}
        {...(UNSAFE_style ? { style: UNSAFE_style } : {})}
        {...(value !== undefined ? { value: toRange(value) } : {})}
        {...(defaultValue !== undefined ? { defaultValue: toRange(defaultValue) } : {})}
        onChange={(range) => onValueChange?.(range ? { start: range.start.toString(), end: range.end.toString() } : null)}
        {...bounds(min, max)}
        placeholderValue={placeholderValue}
        isOpen={open}
        onOpenChange={setOpen}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={Boolean(error)}
        {...(startName ? { startName } : {})}
        {...(endName ? { endName } : {})}
      >
        <PickerLabel label={label} hideLabel={hideLabel} />
        <Field size={size} error={error} disabled={disabled} calendarLabel={calendarLabel}>
          <Segments slot="start" />
          <span className="date-picker__dash" aria-hidden="true">
            –
          </span>
          <Segments slot="end" />
        </Field>
        <PickerHelp description={description} error={error} />
        <Popover className="picker__popover" data-kind="calendar" offset={4} {...(container ? { UNSTABLE_portalContainer: container } : {})}>
          <Dialog className="date-picker__dialog" aria-label={calendarLabel}>
            <RangeCalendar className="date-picker__calendar" data-range="true">
              <CalendarHeader previousMonthLabel={previousMonthLabel} nextMonthLabel={nextMonthLabel} />
              <Grid />
            </RangeCalendar>
          </Dialog>
        </Popover>
      </AriaDateRangePicker>
    </PickerLocale>
  );
}
