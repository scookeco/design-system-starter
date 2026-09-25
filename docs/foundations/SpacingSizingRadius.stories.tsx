import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, vars } from '../../src/index';
import { DocPage, DocSection } from '../ui/DocPage';
import { ScaleTable, docsVar } from './ScaleTable';
import { varEntries } from './tokens';

const bar = (ref: string) => <span className="docs-bar" style={docsVar('--docs-length', ref)} aria-hidden="true" />;
const square = (ref: string) => <span className="docs-square" style={docsVar('--docs-length', ref)} aria-hidden="true" />;
const corner = (ref: string) => <span className="docs-radius" style={docsVar('--docs-radius', ref)} aria-hidden="true" />;

/** Size groups that fit a bar preview; the wide ones (content, dialog, breakpoints) are listed without one. */
const BAR_GROUPS = new Set(['control', 'icon', 'avatar']);

function SpacingPage() {
  const sizeGroups = Object.entries(vars.size);
  return (
    <DocPage
      title="Spacing, sizing and radius"
      lead="Every length in the system comes from these scales. Layout primitives take the gap, inset and width tokens as typed props, so product code never writes a length."
    >
      <DocSection title="Gap">
        <ScaleTable caption="Gap tokens" entries={varEntries(vars.space.gap, 'space.gap')} preview={bar} />
      </DocSection>
      <DocSection title="Inset">
        <ScaleTable caption="Inset tokens" entries={varEntries(vars.space.inset, 'space.inset')} preview={bar} />
      </DocSection>
      <DocSection title="Sizes" intro="Fixed sizes and maximum measures. Center, Sidebar and Grid take the content, sidebar and grid-item tokens as props.">
        <Stack gap="lg">
          {sizeGroups.map(([group, branch]) =>
            typeof branch === 'string' ? (
              <ScaleTable key={group} caption={`size.${group}`} entries={[{ path: `size.${group}`, ref: branch }]} preview={bar} />
            ) : (
              <ScaleTable
                key={group}
                caption={`size.${group}`}
                entries={varEntries(branch, `size.${group}`)}
                preview={BAR_GROUPS.has(group) ? square : undefined}
              />
            ),
          )}
        </Stack>
      </DocSection>
      <DocSection title="Radius" intro="Corner radius by what the element is, not by how round it looks.">
        <ScaleTable caption="Radius tokens" entries={varEntries(vars.radius, 'radius')} preview={corner} />
      </DocSection>
      <DocSection title="Aspect ratios" intro="The shapes Frame holds media to: width divided by height.">
        <ScaleTable caption="Ratio tokens" entries={varEntries(vars.ratio, 'ratio')} />
      </DocSection>
      <DocSection title="Borders and focus">
        <ScaleTable
          caption="Border and focus tokens"
          entries={[...varEntries(vars.border.width, 'border.width'), ...varEntries(vars.focus.ring, 'focus.ring')]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Spacing, sizing and radius', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const SpacingSizingAndRadius: StoryObj = { name: 'Spacing, sizing and radius', render: () => <SpacingPage /> };
