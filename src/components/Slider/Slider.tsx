import { useId, useState } from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';
import './Slider.css';

export interface SliderProps extends EscapeHatch {
  /** Visible label and accessible name: what the value is ("Price", "Volume"). Required. */
  label: string;
  description?: string;
  error?: string;
  /** Id of the first thumb, for an error summary link. Generated when omitted. */
  id?: string;
  /** One value for a single slider, two for a range. */
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  /** Called once when the user lets go or finishes a key press: the moment to save or refetch. */
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Least number of steps between the two thumbs of a range. */
  minStepsBetweenThumbs?: number;
  /** A value in words ("£40", "40%"). Shown beside the track and read out as aria-valuetext. */
  formatValue?: (value: number) => string;
  /** Range only: the names of the two thumbs, appended to the label ("Price, minimum"). */
  thumbLabels?: [string, string];
  disabled?: boolean;
  /** Submits each thumb's value as a hidden input with this name. */
  name?: string;
}

/**
 * Picks a number, or a range, on a continuous scale where the exact value matters less than
 * the position: volume, a price filter. Every thumb is keyboard operable (arrows, Page Up/Down,
 * Home/End) and says its value in words; a click on the track moves the nearest thumb, so no drag
 * is needed. For an exact number use a TextField. Behaviour from Radix Slider.
 */
export function Slider({
  label,
  description,
  error,
  id,
  value,
  defaultValue = [0],
  onValueChange,
  formatValue = String,
  thumbLabels = ['minimum', 'maximum'],
  UNSAFE_className,
  UNSAFE_style,
  ...rootProps
}: SliderProps) {
  const ids = fieldIds(useId(), description, error, id);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const range = current.length > 1;
  const text = current.map(formatValue).join(' – ');
  return (
    <div className={cx('slider', UNSAFE_className)} style={UNSAFE_style}>
      <Field ids={ids} label={label} description={description} error={error} nativeLabel={false}>
        <div className="slider__row">
          <SliderPrimitive.Root
            {...rootProps}
            className="slider__root"
            value={value}
            defaultValue={value ? undefined : defaultValue}
            onValueChange={(next) => {
              setUncontrolled(next);
              onValueChange?.(next);
            }}
          >
            <SliderPrimitive.Track className="slider__track">
              <SliderPrimitive.Range className="slider__range" />
            </SliderPrimitive.Track>
            {current.map((v, i) => (
              <SliderPrimitive.Thumb
                key={i}
                className="slider__thumb"
                id={i === 0 ? ids.controlId : undefined}
                aria-labelledby={range ? undefined : ids.labelId}
                aria-label={range ? `${label}, ${thumbLabels[i] ?? String(i + 1)}` : undefined}
                aria-describedby={ids.describedBy}
                aria-invalid={ids.invalid || undefined}
                aria-valuetext={formatValue(v)}
              />
            ))}
          </SliderPrimitive.Root>
          <span className="slider__value" aria-hidden="true">
            {text}
          </span>
        </div>
      </Field>
    </div>
  );
}
