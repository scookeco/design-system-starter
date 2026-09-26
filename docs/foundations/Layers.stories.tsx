import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, vars } from '../../src/index';
import usageMap from '../../src/tokens/token-usage.json';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { formatValue, token, varEntries } from './tokens';

interface UsageUnit {
  tokens: { token: string; readBy: { unit: string; how: string }[] }[];
}

/** Units whose own stylesheet reads a token: generated from src/tokens/token-usage.json, not typed. */
const readers = (path: string): string[] =>
  Object.entries(usageMap.units as Record<string, UsageUnit>)
    .filter(([name, unit]) => unit.tokens.some((t) => t.token === path && t.readBy.some((r) => r.unit === name && r.how === 'css')))
    .map(([name]) => name)
    .sort();

function LayersPage() {
  const layers = varEntries(vars.z, 'z');
  return (
    <DocPage
      title="Layers"
      lead="Seven stacking tiers, lowest first. Every z-index in the system is one of these tokens, and each kind of surface has one tier, so a menu never opens under a sticky header and a tooltip never hides behind a dialog."
    >
      <DocSection title="Tiers" intro="Used by lists the components and layouts whose stylesheets read each tier, from the token usage map.">
        <Table caption="Stacking tokens">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Use for</TableHeaderCell>
              <TableHeaderCell>Used by</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {layers.map(({ path, ref }) => (
              <TableRow key={path}>
                <TableCell rowHeader>
                  <code>{ref.slice(4, -1)}</code>
                </TableCell>
                <TableCell>
                  <code>{formatValue(path)}</code>
                </TableCell>
                <TableCell>{token(path).description}</TableCell>
                <TableCell>{readers(path).join(', ') || 'Nothing: the default'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Rules">
        <Rules
          items={[
            <>Never write a raw z-index. Pick the tier for what the surface is, not for what it has to beat today.</>,
            <>A new overlay joins an existing tier. A new tier is a token change: it goes through the decision ladder.</>,
            <>
              Overlays portal to <code>body</code>, so their tier competes with the page’s, not with their trigger’s parent. A component that must stay
              inside its container (Imposter) creates its own stacking context with <code>isolation: isolate</code>.
            </>,
            <>A modal makes everything below it inert. Toasts and tooltips sit above modals because they describe what happens inside them.</>,
            <>Sticky content that can cover focused elements needs scroll padding (Foundations/Focus and target size).</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Layers', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const Layers: StoryObj = { name: 'Layers', render: () => <LayersPage /> };
