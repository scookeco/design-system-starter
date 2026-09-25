import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import {
  adjacentPairs,
  CATEGORICAL,
  DIVERGING,
  minSurfaceContrast,
  RULES,
  SEQUENTIAL,
} from '../../scripts/checks/chart-palette';
import { oklch } from '../../scripts/checks/color-distance';
import { Cluster, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { cssVar, dark, light } from './tokens';

/**
 * Chart colours, rendered from the token source through scripts/checks/chart-palette.ts: the
 * same palettes, thresholds and maths tests/unit/contrast.test.ts runs.
 */

const resolvers = { light, dark } as const;
const MODES = ['light', 'dark'] as const;
const f2 = (n: number) => n.toFixed(2);
const f1 = (n: number) => n.toFixed(1);
const last = (path: string) => path.split('.').at(-1) ?? path;

function Swatch({ value }: { value: string }) {
  return <span className="docs-swatch" style={{ '--docs-swatch': value } as CSSProperties} aria-hidden="true" />;
}

/** The colour as a mark on the surface it will sit on, in each theme. */
function OnSurface({ path }: { path: string }) {
  return (
    <span className="docs-swatch-row">
      {MODES.map((mode) => (
        <span
          key={mode}
          className="docs-sample docs-sample--stroke"
          style={{ '--docs-sample-fg': resolvers[mode](path), '--docs-sample-bg': resolvers[mode]('color.bg.surface') } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ValueCell({ path, mode }: { path: string; mode: 'light' | 'dark' }) {
  const value = resolvers[mode](path);
  return (
    <TableCell>
      <span className="docs-swatch-row">
        <Swatch value={value} />
        <code>{value}</code>
      </span>
    </TableCell>
  );
}

function PaletteTable({ caption, paths, label }: { caption: string; paths: readonly string[]; label: (path: string) => ReactNode }) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <TableHeaderCell>Light</TableHeaderCell>
          <TableHeaderCell>Dark</TableHeaderCell>
          <TableHeaderCell>On surface (light · dark)</TableHeaderCell>
          <TableHeaderCell numeric>Lowest contrast (light · dark)</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {paths.map((path) => (
          <TableRow key={path}>
            <TableCell rowHeader>
              <Stack gap="2xs">
                <span>{label(path)}</span>
                <Text as="span" size="caption" tone="muted">
                  <code>{cssVar(path).slice(4, -1)}</code>
                </Text>
              </Stack>
            </TableCell>
            <ValueCell path={path} mode="light" />
            <ValueCell path={path} mode="dark" />
            <TableCell>
              <OnSurface path={path} />
            </TableCell>
            <TableCell numeric>
              {f2(minSurfaceContrast(path, light))}:1 · {f2(minSurfaceContrast(path, dark))}:1
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PairTable() {
  const pairs = MODES.map((mode) => adjacentPairs(CATEGORICAL, resolvers[mode]));
  return (
    <Table caption="Adjacent categorical slots, ΔE_OK (light · dark)">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Slots</TableHeaderCell>
          <TableHeaderCell numeric>Normal vision (min {RULES.ADJACENT_NORMAL})</TableHeaderCell>
          <TableHeaderCell numeric>Protanopia (min {RULES.ADJACENT_CVD})</TableHeaderCell>
          <TableHeaderCell numeric>Deuteranopia (min {RULES.ADJACENT_CVD})</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(pairs[0] ?? []).map((pair, i) => {
          const darkPair = pairs[1]?.[i];
          const both = (key: 'normal' | 'protan' | 'deutan') => `${f1(pair[key])} · ${darkPair ? f1(darkPair[key]) : '–'}`;
          return (
            <TableRow key={pair.a}>
              <TableCell rowHeader>
                {last(pair.a)} / {last(pair.b)}
              </TableCell>
              <TableCell numeric>{both('normal')}</TableCell>
              <TableCell numeric>{both('protan')}</TableCell>
              <TableCell numeric>{both('deutan')}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** A stacked bar painted with var(): it follows the theme toolbar, like a real chart would. */
function StackedBarExample() {
  const data = [
    { label: 'Starter', value: 412 },
    { label: 'Team', value: 318 },
    { label: 'Business', value: 164 },
    { label: 'Enterprise', value: 47 },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <figure className="docs-example">
      <Stack gap="sm">
        <Text as="span" id="docs-plan-chart">
          Accounts by plan: Starter is the largest, at 44% of 941
        </Text>
        <div className="docs-stacked-bar" role="img" aria-labelledby="docs-plan-chart">
          {data.map((d, i) => (
            <span
              key={d.label}
              className="docs-stacked-bar__segment"
              style={{ flexGrow: d.value, '--docs-swatch': cssVar(CATEGORICAL[i] ?? '') } as CSSProperties}
            />
          ))}
        </div>
        <Cluster as="ul" role="list" gap="md" aria-label="Legend">
          {data.map((d, i) => (
            <li key={d.label} className="docs-swatch-row">
              <span className="docs-swatch" style={{ '--docs-swatch': cssVar(CATEGORICAL[i] ?? '') } as CSSProperties} aria-hidden="true" />
              <Text as="span">
                {d.label}: {d.value} ({Math.round((d.value / total) * 100)}%)
              </Text>
            </li>
          ))}
        </Cluster>
      </Stack>
    </figure>
  );
}

function DataVisualisationPage() {
  const chroma = (path: string) => `${f2(oklch(light(path)).c)} · ${f2(oklch(dark(path)).c)}`;
  return (
    <DocPage
      title="Data visualisation"
      lead="Colours for chart marks: a categorical palette for series, a sequential ramp for magnitude and a diverging scale for polarity. Values, contrast and distances are computed from the token source by the same code the tests run, in both themes."
    >
      <DocSection
        title="Rules every chart follows"
        intro="Colour tells series apart; it never carries meaning on its own (WCAG 2.2 SC 1.4.1). A chart that loses its colours must still be readable."
      >
        <Rules
          items={[
            'Pair colour with a second cue: a legend with text labels for two or more series, direct labels on up to four, and patterns or markers where marks overlap or print in greyscale.',
            'Give every chart role="img" and an accessible name that states the takeaway, and a table or caption with the exact numbers.',
            'Text in a chart (labels, values, legends, axes) uses the text roles (color.fg.*), never a series colour.',
            'Assign categorical colours in slot order and never cycle them: a ninth series folds into “Other” or small multiples. A series keeps its colour when a filter removes others.',
            'Series are not statuses. Never use color.status.* for a series, or a chart colour for success, warning or danger.',
            'One hue for magnitude (sequential), two hues and a neutral midpoint for polarity (diverging). Never a rainbow.',
          ]}
        />
        <StackedBarExample />
      </DocSection>

      <DocSection
        title="Categorical"
        intro={`Series identity. Every slot reaches ${String(RULES.MARK_CONTRAST)}:1 against every surface (canvas, surface, subtle, elevated) in both themes and keeps OKLCH chroma of at least ${String(RULES.MIN_CHROMA)} (light · dark: ${CATEGORICAL.map(chroma).join(', ')}).`}
      >
        <PaletteTable caption="Categorical palette, in slot order" paths={CATEGORICAL} label={(path) => `Slot ${last(path)}`} />
        <Text tone="muted">
          Distinguishability rule: neighbouring slots, which touch in stacked bars and sit side by side in legends, differ by at least ΔE_OK{' '}
          {RULES.ADJACENT_NORMAL} with normal vision and at least {RULES.ADJACENT_CVD} under simulated protanopia and deuteranopia. ΔE_OK is the
          distance in the OKLab colour space × 100; colour-vision deficiency is simulated with the Machado, Oliveira and Fernandes (2009) model at
          full severity. Scatter plots and maps, where any two colours can meet, stay at three or four series, or use small multiples.
        </Text>
        <PairTable />
      </DocSection>

      <DocSection
        title="Sequential"
        intro={`Magnitude, from step 1 (lowest) to 5 (highest). Each step stands out more from the surface than the one before, and moves at least ${String(RULES.RAMP_STEP_L)} in lightness, so the order survives colour-vision deficiency and greyscale. In light mode the ramp darkens; in dark mode it lightens.`}
      >
        <PaletteTable caption="Sequential ramp, low to high" paths={SEQUENTIAL} label={(path) => `Step ${last(path)}`} />
      </DocSection>

      <DocSection
        title="Diverging"
        intro={`Polarity around a baseline (a target, zero, the average). The midpoint is neutral (chroma at most ${String(RULES.NEUTRAL_CHROMA)}); each arm stands out more with distance from it. “Below” and “above” say which side of the baseline, not whether that is good.`}
      >
        <PaletteTable caption="Diverging scale, below to above" paths={DIVERGING} label={(path) => last(path).replace('-', ' ')} />
      </DocSection>

      <DocSection title="Using the tokens" intro="Chart code reads the semantic tokens like any system CSS; the values switch with the theme.">
        <Rules
          items={[
            <>
              Series <code>n</code>: <code>{cssVar('color.chart.categorical.1')}</code> … <code>{cssVar('color.chart.categorical.8')}</code>, or{' '}
              <code>vars.color.chart.categorical[n]</code> from the public entry.
            </>,
            <>
              Separate touching fills (stacked segments, adjacent bars) with a gap of surface colour, so neighbours never rely on hue alone. Gridlines
              use <code>{cssVar('color.border.default')}</code>.
            </>,
            <>
              Sequential and diverging steps are fills for magnitude (heatmap cells, choropleths, bars coloured by value): label the scale with a
              legend that shows the numbers at each step.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = {
  title: 'Foundations/Data visualisation',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const DataVisualisation: StoryObj = { name: 'Data visualisation', render: () => <DataVisualisationPage /> };
