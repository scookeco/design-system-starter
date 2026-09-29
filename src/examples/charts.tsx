/**
 * Three small charts for the reports example, drawn as SVG from the chart tokens only
 * (`vars.color.chart.*`, as Foundations/Data visualisation documents). They live in the example
 * layer on purpose: the design system ships the palette and the rules, not a chart library.
 *
 * Every chart follows the page's rules:
 *   - its accessible name (role="img") states the takeaway, and the card says it in words too;
 *   - its exact numbers are one Disclosure away, as a table (ChartNumbers);
 *   - colour never carries meaning alone: series are named in a legend with their values, in the
 *     order they're drawn, and single-series charts use one colour for everything;
 *   - labels and numbers are HTML text in the fg roles, never SVG text (which would scale with the
 *     drawing), and touching fills are separated by a gap in the geometry;
 *   - sizes are tokens (bar thickness, swatches) or follow the container (a viewBox's ratio).
 */
import type { ReactNode } from 'react';
import { Cluster, Disclosure, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../index';

/** Categorical slots, in order: series 1 takes slot 1, and so on. Never cycled. */
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => vars.color.chart.categorical[String(n) as keyof typeof vars.color.chart.categorical]);

export interface ChartDatum {
  /**
   * What the datum is (an id, a status, a month), for React's keys. Never the label: a label can be a
   * placeholder shared by several rows while it loads ("…"), and duplicate keys leave stale rows behind.
   */
  key: string;
  label: string;
  value: number;
  /** The value as a person reads it: formatted by the page with useFormat(). */
  display: string;
}

/** A colour swatch for a legend: a token-sized square in the series' slot colour. Decorative: the text names the series. */
function Swatch({ slot }: { slot: number }) {
  return (
    <svg width={vars.size.icon.sm} height={vars.size.icon.sm} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <rect width="10" height="10" rx="2" fill={SLOTS[slot] ?? SLOTS[0]} />
    </svg>
  );
}

/**
 * Parts of a whole, as one bar: each segment in its slot colour, a gap between them, and a legend
 * that names each part with its value and share, in the same order.
 */
export function StackedBarChart({ label, data, share }: { label: string; data: readonly ChartDatum[]; share: (fraction: number) => string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const width = 1000;
  const gap = 6;
  const drawn = data.filter((d) => d.value > 0);
  const room = width - gap * Math.max(0, drawn.length - 1);
  let x = 0;
  return (
    <Stack gap="sm">
      <svg role="img" aria-label={label} width="100%" height={vars.size.control.sm} viewBox={`0 0 ${String(width)} 10`} preserveAspectRatio="none">
        {drawn.map((d) => {
          const w = total === 0 ? 0 : (d.value / total) * room;
          const slot = data.indexOf(d);
          const rect = <rect key={d.key} x={x} y={0} width={w} height={10} fill={SLOTS[slot] ?? SLOTS[0]} />;
          x += w + gap;
          return rect;
        })}
      </svg>
      <Cluster as="ul" role="list" aria-label="Legend" gap="md">
        {data.map((d, i) => (
          <Cluster as="li" key={d.key} gap="xs" align="center" wrap={false}>
            <Swatch slot={i} />
            <Text as="span" size="caption">{`${d.label}: ${d.display} (${share(total === 0 ? 0 : d.value / total)})`}</Text>
          </Cluster>
        ))}
      </Cluster>
    </Stack>
  );
}

/**
 * One value per category, largest first, as horizontal bars in one colour (a single series, so
 * colour means nothing): each bar under its label and value, on a track like a Meter's. The labels
 * and values are the list's text, so the chart reads as a list; the bars are decoration.
 */
export function BarChart({ label, data }: { label: string; data: readonly ChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Stack as="ol" role="list" gap="sm" aria-label={label}>
      {data.map((d) => (
        <Stack as="li" key={d.key} gap="2xs">
          <Cluster justify="between" gap="sm" wrap={false}>
            <Text as="span" size="caption">
              {d.label}
            </Text>
            <Text as="span" size="caption" numeric>
              {d.display}
            </Text>
          </Cluster>
          <svg width="100%" height={vars.size.bar} viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <rect width={100} height={1} fill={vars.color.bg.subtle} />
            <rect width={(d.value / max) * 100} height={1} fill={SLOTS[0]} />
          </svg>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Values over time, as columns in one colour, with gridlines at zero, half and the top of the
 * scale. The scale and the first and last periods are labelled in text around the drawing; every
 * value is in the table.
 */
export function ColumnChart({ label, data, top, first, last }: { label: string; data: readonly ChartDatum[]; top: string; first: string; last: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const column = 100;
  const gap = 24;
  const width = column * data.length;
  // The drawing keeps one shape at any width: as tall as 40% of its width.
  const height = width * 0.4;
  return (
    <Stack gap="xs">
      <Text size="caption" tone="muted">
        {top}
      </Text>
      <svg role="img" aria-label={label} width="100%" viewBox={`0 0 ${String(width)} ${String(height)}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((at) => (
          <line
            key={at}
            x1={0}
            x2={width}
            y1={height - at * height}
            y2={height - at * height}
            stroke={vars.color.border.default}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * height;
          return <rect key={d.key} x={i * column + gap / 2} y={height - h} width={column - gap} height={h} fill={SLOTS[0]} />;
        })}
      </svg>
      <Cluster justify="between" gap="sm">
        <Text as="span" size="caption" tone="muted">
          {first}
        </Text>
        <Text as="span" size="caption" tone="muted">
          {last}
        </Text>
      </Cluster>
    </Stack>
  );
}

/** A chart's exact numbers, as a table, behind a Disclosure: the text alternative every chart has. */
export function ChartNumbers({
  caption,
  columns,
  rows,
  defaultOpen = false,
}: {
  caption: string;
  columns: readonly [string, ...{ label: string; numeric?: boolean }[]];
  rows: readonly { key: string; cells: readonly [ReactNode, ...ReactNode[]] }[];
  defaultOpen?: boolean;
}) {
  const [head, ...rest] = columns;
  return (
    <Disclosure summary="Show the numbers" defaultOpen={defaultOpen}>
      <Table caption={caption}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{head}</TableHeaderCell>
            {rest.map((c) => (
              <TableHeaderCell key={c.label} numeric={c.numeric ?? false}>
                {c.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const [first, ...others] = row.cells;
            return (
              <TableRow key={row.key}>
                <TableCell rowHeader>{first}</TableCell>
                {others.map((cell, i) => (
                  <TableCell key={rest[i]?.label ?? i} numeric={rest[i]?.numeric ?? false}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Disclosure>
  );
}
