import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../../src/index';
import { contrastRatio } from '../../scripts/checks/contrast';
import { pairs } from '../../scripts/checks/contrast-pairs';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { ScaleTable } from './ScaleTable';
import { dark, light, varEntries } from './tokens';

const ratio = (n: number) => `${n.toFixed(2)}:1`;

/** The tested pairs of the focus colour: every surface it can sit on, from scripts/checks/contrast-pairs.ts. */
const focusPairs = pairs.filter((p) => p.fg === 'color.focus');

function FocusTargetPage() {
  return (
    <DocPage
      title="Focus and target size"
      lead="Keyboard users need to see where they are; pointer and touch users need something big enough to hit. One focus ring for every focusable element, and one minimum size for every target."
    >
      <DocSection title="The focus ring" intro="Drawn once, in the base layer, on :focus-visible: keyboard focus always shows, a mouse click doesn’t.">
        <Cluster gap="lg">
          <span className="docs-focus-sample" aria-hidden="true">
            Focused control
          </span>
        </Cluster>
        <ScaleTable caption="Focus tokens" entries={[...varEntries(vars.focus.ring, 'focus.ring')]} />
        <Table caption="Focus colour against every surface (WCAG 2.2 non-text contrast, 3:1)">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Surface</TableHeaderCell>
              <TableHeaderCell>Light</TableHeaderCell>
              <TableHeaderCell>Dark</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {focusPairs.map((p) => (
              <TableRow key={p.bg}>
                <TableCell rowHeader>
                  <code>{p.bg}</code>
                </TableCell>
                <TableCell>{ratio(contrastRatio(light(p.fg), light(p.bg)))}</TableCell>
                <TableCell>{ratio(contrastRatio(dark(p.fg), dark(p.bg)))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>
              Components never restyle focus. Never write <code>outline: none</code> without a replacement; the only exception is an element focused
              by script and not by the user (a <code>main</code> after a route change).
            </>,
            <>The ring is an outline, not a box-shadow, so it survives Windows forced-colours mode.</>,
            <>Focus is never hidden by sticky content (WCAG 2.2 SC 2.4.11): scroll containers with a sticky header or action bar keep the scroll padding below clear.</>,
          ]}
        />
        <ScaleTable caption="Scroll padding tokens" entries={varEntries(vars.space['scroll-padding'], 'space.scroll-padding')} />
      </DocSection>
      <DocSection title="Target size" intro="WCAG 2.2 SC 2.5.8 (AA): every pointer target is at least 24 by 24 CSS pixels, or spaced so a 24px circle on it touches no other target.">
        <ScaleTable caption="Target size token" entries={[{ path: 'size.target-min', ref: vars.size['target-min'] }]} />
        <Cluster gap="xl" align="center">
          <Stack gap="xs" align="center">
            <span className="docs-target" aria-hidden="true" />
            <Text size="caption">24px: passes</Text>
          </Stack>
          <Stack gap="xs" align="center">
            <span className="docs-target-circle" aria-hidden="true">
              <span className="docs-target" data-size="small" />
            </span>
            <Text size="caption">Smaller, but its 24px circle is clear: passes by spacing</Text>
          </Stack>
        </Cluster>
        <Rules
          items={[
            <>
              Size the control itself with <code>size.target-min</code> or a control height. Padding on a wrapper or a pseudo-element doesn’t count.
            </>,
            <>Icon buttons, remove buttons on tags and files, slider thumbs and pagination links are all at least 24px in the system.</>,
            <>Links inside running text are exempt; links in a list or a toolbar are not.</>,
            <>
              Checked on every story by the WCAG 2.2 suite (<code>npm run test:wcag22</code>), with a fixture story that proves the check fails.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Focus and target size', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const FocusAndTargetSize: StoryObj = { name: 'Focus and target size', render: () => <FocusTargetPage /> };
