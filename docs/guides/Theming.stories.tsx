import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { semanticColoursFrom } from '../foundations/tokens';
import { Code } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

/** The primitive ramp the house brand is built from. */
const BRAND_RAMP = 'color.indigo.';

/** Semantic colours whose light or dark value comes from the brand ramp: read from the token build, not typed. */
const brandTokens = semanticColoursFrom(BRAND_RAMP);

function Theming() {
  return (
    <DocPage
      title="Theming and adding a brand"
      lead="Every alternate look (dark mode, a rebrand, a customer’s colours) is a remap of the semantic token tier. Components read only semantic tokens, so a new theme is a list of values, never a change to a component."
    >
      <DocSection title="How the tiers make it a remap">
        <Rules
          items={[
            <>
              <strong>Primitive</strong> tokens are raw values with no meaning: <code>color.indigo.600</code>. Nothing in the system reads them
              directly; a test fails if a stylesheet does.
            </>,
            <>
              <strong>Semantic</strong> tokens say what a value is for: <code>color.action.primary</code>, <code>color.focus</code>. They alias a
              primitive, once for light and once for dark.
            </>,
            <>
              <strong>Component</strong> tokens are per-part override hooks (<code>button.primary.bg</code>) that alias semantic tokens.
            </>,
            <>So a theme changes which primitive each semantic token points at, and everything downstream follows.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Dark mode, as built" intro="Each semantic colour holds both values; the scheme picks one.">
        <Code label="Semantic colour in tokens.css">{`
:root { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
--color-action-primary: light-dark(var(--color-indigo-600), var(--color-indigo-400));
`}</Code>
        <Rules
          items={[
            <>Components contain no theme rules. Contrast is tested per pair in both schemes, and the gallery captures every story in both.</>,
            <>Dark depth comes from lighter surfaces, not darker shadows; status and brand colours get their own dark values.</>,
          ]}
        />
      </DocSection>
      <DocSection title="What carries the brand today" intro="The semantic colours whose light or dark value comes from the brand ramp. Rebranding means remapping these, and only these.">
        <Table caption="Brand-carrying semantic colours">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Light</TableHeaderCell>
              <TableHeaderCell>Dark</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brandTokens.map((t) => (
              <TableRow key={t.path}>
                <TableCell rowHeader>
                  <code>{t.path}</code>
                </TableCell>
                <TableCell>
                  <code>{t.light}</code>
                </TableCell>
                <TableCell>
                  <code>{t.dark}</code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Changing the brand, step by step" intro="For a rebrand of the one product: the house colours change for everyone.">
        <Stack as="ol" gap="xs">
          <li>
            Add the new ramp to <code>tokens/primitive/color.json</code>, all eleven steps (50 to 950), so light and dark each have room to pick
            a passing shade.
          </li>
          <li>
            In <code>tokens/semantic/color.json</code>, point each brand-carrying token above at the new ramp: the light <code>$value</code> and
            the dark value under <code>$extensions.starter.modes.dark</code>.
          </li>
          <li>
            Run <code>npm run tokens</code>. It regenerates tokens.css, tokens.ts and the token usage map.
          </li>
          <li>
            Run <code>npm test</code>. The contrast test checks every pair in both schemes: link text at 4.5:1 on every surface, the primary fill
            and the focus ring at 3:1, the label on the primary fill at 4.5:1. A failing pair means a darker (or, in dark mode, lighter) step.
          </li>
          <li>Run the visual suite, review the changed screenshots, and regenerate the Linux baselines on the branch.</li>
          <li>Nothing under src/components, src/primitives or src/layouts changes. If something must, it read a primitive: fix that instead.</li>
        </Stack>
      </DocSection>
      <DocSection title="A second brand beside the first" intro="Not built yet. It arrives with the second brand or tenant, and this is the plan.">
        <Rules
          items={[
            <>
              Brand becomes another mode on the semantic tier, beside the scheme: <code>data-brand</code> on the root selects a brand’s primitive
              mapping, <code>color-scheme</code> still selects light or dark, and the build writes every brand × scheme combination.
            </>,
            <>The contrast test and the visual suite run per brand × scheme, not only for the house brand in light.</>,
            <>
              One component set for every brand. Radius, type family and density can be brand tokens; structure can’t. A brand that seems to need
              different markup is asking for a variant.
            </>,
            <>
              A customer’s colour is untrusted input: check it for contrast when it is saved, and derive or reject the text-on-brand roles rather
              than shipping a pale primary that fails 3:1.
            </>,
          ]}
        />
        <Text tone="muted">Until then, the README’s “Deliberately not included yet” table tracks it.</Text>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Theming and adding a brand', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const ThemingGuide: StoryObj = { name: 'Theming and adding a brand', render: () => <Theming /> };
