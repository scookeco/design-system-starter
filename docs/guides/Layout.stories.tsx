import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const PRIMITIVES = [
  { name: 'Stack', id: 'primitives-stack--default', choose: 'Things flow top to bottom: a page’s sections, a form, a card body.', avoid: 'Items sit side by side (Cluster).' },
  { name: 'Cluster', id: 'primitives-cluster--default', choose: 'A row that may wrap: button groups, filter bars, tags, a title with actions (justify="between").', avoid: 'The row must line up in columns (Grid or Table).' },
  { name: 'Grid', id: 'primitives-grid--default', choose: 'Equal items that reflow by width with no breakpoints: cards, stat tiles.', avoid: 'Rows of comparable attributes (Table), or two regions of different weight (Sidebar).' },
  { name: 'Sidebar', id: 'primitives-sidebar--start', choose: 'A narrow region beside the main one, stacking when space runs out: a record’s properties rail, a settings sub-nav.', avoid: 'The app’s navigation: AppShell already owns it.' },
  { name: 'Center', id: 'primitives-center--default', choose: 'The page column inside AppShell’s main, with a bounded measure and gutters; empty states (intrinsic).', avoid: 'Centring a single control in a row (Cluster justify="center").' },
] as const;

function Layout() {
  return (
    <DocPage
      title="Layout"
      lead="Five layout primitives arrange everything on a page. They take gaps and widths as tokens, so a layout can’t drift off the scale, and they hold no domain knowledge."
    >
      <DocSection title="Which primitive">
        <Table caption="Layout primitives">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Primitive</TableHeaderCell>
              <TableHeaderCell>Choose when</TableHeaderCell>
              <TableHeaderCell>Avoid when</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {PRIMITIVES.map((p) => (
              <TableRow key={p.name}>
                <TableCell rowHeader>
                  <StoryLink id={p.id}>{p.name}</StoryLink>
                </TableCell>
                <TableCell>{p.choose}</TableCell>
                <TableCell>{p.avoid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Composing into AppShell">
        <Text>
          AppShell owns the frame: skip link, sidebar navigation, header and the one scrolling <code>main</code>. A page fills its slots and
          lays out its own content with primitives, starting from a Center column.
        </Text>
        <Code label="Page skeleton">{`
<AppShell brand={…} nav={…} breadcrumbs={…} userMenu={…} footer={actionBar}>
  <Center max="lg" gutters="lg">
    <Stack gap="lg">
      <Cluster justify="between">          {/* title left, actions right */}
        <Heading level={1}>Hardware lease</Heading>
        <Button>Edit</Button>
      </Cluster>
      <Sidebar placement="end" sideWidth="lg" side={propertiesCard}>
        <Stack gap="lg">{/* main column: cards */}</Stack>
      </Sidebar>
    </Stack>
  </Center>
</AppShell>
`}</Code>
      </DocSection>
      <DocSection title="Rules">
        <Rules
          items={[
            <>The parent owns the space between children. Pick a gap token; never add margins.</>,
            <>Pass semantic elements with <code>as</code> (<code>section</code>, <code>ul</code>, <code>form</code>) so the layout is also the outline.</>,
            <>Layouts respond to their container, not the viewport. AppShell collapses its sidebar into a drawer below the medium breakpoint.</>,
            <>
              Only <code>main</code> scrolls. Long forms put their actions in AppShell’s <code>footer</code> slot, which sticks to the bottom.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Layout', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const LayoutGuide: StoryObj = { name: 'Layout', render: () => <Layout /> };
