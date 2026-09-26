import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { ScaleTable } from './ScaleTable';
import { formatValue, resolveValue, token, tokens, varEntries } from './tokens';

/*
 * "Queried by" is read from the system's stylesheets, not typed: every @container or @media
 * length is matched to the breakpoint token with the same value (tests/unit/css.test.ts fails any
 * query length that matches none).
 */
const sheets = import.meta.glob<string>('../../src/{components,layouts,primitives}/*/*.css', { query: '?raw', import: 'default', eager: true });

const QUERY = /@(?:container|media)[^{]*?(\d+(?:\.\d+)?)(rem|px)/g;

const queriedBy = (path: string): string[] => {
  const { value, unit } = resolveValue(tokens, path) as { value: number; unit: string };
  const units = new Set<string>();
  for (const [file, css] of Object.entries(sheets)) {
    for (const m of css.matchAll(QUERY)) {
      if (Number(m[1]) === value && m[2] === unit) units.add(file.split('/').at(-2) ?? file);
    }
  }
  return [...units].sort();
};

function BreakpointsPage() {
  const breakpoints = varEntries(vars.size.breakpoint, 'size.breakpoint');
  return (
    <DocPage
      title="Breakpoints and layout grid"
      lead="Layouts respond to the space they are given, not to the device. Two breakpoint tokens mark where the page frame changes; inside it, intrinsic layout primitives wrap and stack on their own, so there is no column grid to line things up against."
    >
      <DocSection title="Breakpoints" intro="Container-query widths. A layout queries its own container, so the same page works in a full window, a split view or a drawer.">
        <Table caption="Breakpoint tokens">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>What changes</TableHeaderCell>
              <TableHeaderCell>Queried by</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakpoints.map(({ path, ref }) => (
              <TableRow key={path}>
                <TableCell rowHeader>
                  <code>{ref.slice(4, -1)}</code>
                </TableCell>
                <TableCell>
                  <code>{formatValue(path)}</code>
                </TableCell>
                <TableCell>{token(path).description}</TableCell>
                <TableCell>{queriedBy(path).join(', ') || 'Nothing yet'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>
              Queries can’t read <code>var()</code>, so a query writes the token’s value; a unit test fails any query length that isn’t a breakpoint
              token.
            </>,
            <>Prefer container queries to media queries: a region inside a narrow panel should stack even on a wide screen.</>,
            <>Add a breakpoint only when a layout changes shape there. Components never add one to tune spacing.</>,
            <>The gallery’s Width toolbar renders any story at narrow (half of sm), medium (sm) and wide (md) container widths.</>,
          ]}
        />
      </DocSection>
      <DocSection
        title="Layout grid"
        intro="Instead of a 12-column grid, a few measures that primitives take as props. Content sets its own width inside them, and rows wrap when there is no room."
      >
        <Stack gap="lg">
          <ScaleTable caption="Content measures (Center max)" entries={varEntries(vars.size.content, 'size.content')} />
          <ScaleTable caption="Grid item minimums (Grid min, Reel itemWidth)" entries={varEntries(vars.size['grid-item'], 'size.grid-item')} />
          <ScaleTable caption="Sidebar widths (Sidebar)" entries={varEntries(vars.size.sidebar, 'size.sidebar')} />
        </Stack>
        <Rules
          items={[
            <>
              Columns come from <code>Grid</code>: as many as fit at the minimum item width, never a fixed count, so a card grid goes from one column
              to four without a breakpoint.
            </>,
            <>
              Two regions side by side come from <code>Sidebar</code> (and <code>PageLayout</code> for a page’s nav, main and aside): the side keeps
              its width until the main column would drop below its minimum, then they stack.
            </>,
            <>
              Reading width comes from <code>Center</code>. Long text stays under the <code>md</code> measure; forms and settings under{' '}
              <code>sm</code>.
            </>,
            <>
              Space between regions is a gap token (Foundations/Spacing, sizing and radius); page gutters are <code>Center</code>’s{' '}
              <code>gutters</code>.
            </>,
          ]}
        />
        <Text tone="muted">Every value above is read from the token source; change a token and this page, the primitives and the tests follow.</Text>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Breakpoints and layout grid', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const BreakpointsAndLayoutGrid: StoryObj = { name: 'Breakpoints and layout grid', render: () => <BreakpointsPage /> };
