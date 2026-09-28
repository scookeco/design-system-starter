import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid, Stack, Text } from '../../src/index';
// Internal on purpose: the page draws with the system's Icon, and lists the set from its one list.
import { Icon } from '../../src/components/Icon/Icon';
import { iconsByName } from '../../src/components/Icon/names';

const ALL_ICONS = Object.values(iconsByName);

/** The export an icon is imported as: "chevron-down" → ChevronDownIcon. */
const exportName = (name: string) => `${name.replace(/(^|-)([a-z])/g, (_match: string, _dash: string, letter: string) => letter.toUpperCase())}Icon`;
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function IconsPage() {
  return (
    <DocPage
      title="Icons"
      lead="A small, closed set drawn on one 20-unit grid with one stroke token. Each icon is a value you import from the system’s entry and pass to a component’s icon prop, so a page bundles only the icons it uses."
    >
      <DocSection title={`The set (${String(ALL_ICONS.length)})`} intro="Rendered by the system Icon component at size md, with the name each is imported as.">
        <Grid as="ul" role="list" min="sm" gap="sm">
          {ALL_ICONS.map((icon) => (
            <li key={icon.name} className="docs-icon">
              <Stack gap="xs" align="center">
                <Icon icon={icon} size="md" />
                <Text as="span" size="caption">
                  <code>{exportName(icon.name)}</code>
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
            'Pass the icon as a value (icon={InboxIcon}), never by name: looking an icon up by name bundles the whole set. iconsByName and IconName are deprecated, for data that names icons.',
            'Need a new icon? Add it to src/components/Icon/icons.ts and to the list in names.ts, on the same grid and stroke, as a design-system change.',
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Icons', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const Icons: StoryObj = { render: () => <IconsPage /> };
