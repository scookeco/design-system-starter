import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid, Stack, Text } from '../../src/index';
// Internal on purpose: the icon set is closed and not part of the public API.
import { ICON_NAMES, Icon } from '../../src/components/Icon/Icon';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function IconsPage() {
  return (
    <DocPage
      title="Icons"
      lead="A small, closed set drawn on one 20-unit grid with one stroke token. Components take an icon by name; product code never imports an icon file."
    >
      <DocSection title={`The set (${String(ICON_NAMES.length)})`} intro="Rendered by the system Icon component at size md.">
        <Grid as="ul" role="list" min="sm" gap="sm">
          {ICON_NAMES.map((name) => (
            <li key={name} className="docs-icon">
              <Stack gap="xs" align="center">
                <Icon name={name} size="md" />
                <Text as="span" size="caption">
                  <code>{name}</code>
                </Text>
              </Stack>
            </li>
          ))}
        </Grid>
      </DocSection>
      <DocSection title="Rules">
        <Rules
          items={[
            'Icons are decorative (aria-hidden). Meaning comes from the visible label or the control’s accessible name.',
            'An icon-only button needs an aria-label and a Tooltip with the same words.',
            'Status icons pair with text: a Badge or Banner never relies on colour or icon alone.',
            'Need a new icon? Add it to the set in the Icon component, on the same grid and stroke, as a design-system change.',
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Icons', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const Icons: StoryObj = { render: () => <IconsPage /> };
