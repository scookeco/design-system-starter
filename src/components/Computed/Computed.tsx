import { useContext, useEffect } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { RowContext, fullName, useDocumentData, useRegisterComputed } from '../Document/data';
import { evaluateExpression, parseExpression, type Value } from '../DocumentRuntime/expression';
import './Computed.css';

/** How a computed value reads: a plain number, money (integer minor units), a percentage (0.085 → 8.5%), or as it is. */
export type ComputedFormat = 'number' | 'currency' | 'percent' | 'text';

export interface ComputedProps {
  /** Its data key: other formulas use it ("subtotal"; in a Repeat row, per row: "amount", read as items.amount). Required. */
  name: string;
  /** The expression it is ("qty * unit_price", "sum(items.amount)", "subtotal + tax"). Required. */
  formula: string;
  /** Default number. */
  format?: ComputedFormat;
  /** The currency for format currency. Default: the Document's. */
  currency?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/**
 * A value derived from others (an invoice line's amount, its total), recomputed on every change and
 * never typed. It reads like a filled field. Money is integer minor units, as currency fields store it.
 */
export function Computed({ name, formula, format = 'number', currency, area }: ComputedProps) {
  useRegisterComputed(name, formula);
  const data = useDocumentData();
  const row = useContext(RowContext);
  const formatter = useFormat();
  let value: Value = null;
  let error: string | null = null;
  try {
    value = evaluateExpression(parseExpression(formula), (path) => data.lookup(path, row));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  useEffect(() => {
    if (error) console.error(`Computed "${name}": ${error}`);
  }, [error, name]);
  const n = typeof value === 'number' ? value : null;
  const text =
    value === null
      ? ''
      : format === 'currency' && n !== null
        ? formatter.money(Math.round(n), currency ?? data.currency)
        : format === 'percent' && n !== null
          ? formatter.percent(n)
          : format === 'number' && n !== null
            ? formatter.number(n)
            : String(value);
  return (
    <output className="computed" data-doc="computed" data-name={fullName(name, row)} data-formula={formula} data-value={value === null ? '' : String(value)} style={areaStyle(area)}>
      {text}
    </output>
  );
}
