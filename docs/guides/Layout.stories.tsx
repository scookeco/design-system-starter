import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const PRIMITIVES = [
  { name: 'Stack', id: 'primitives-stack--default', choose: 'Things flow top to bottom: a page’s sections, a form, a card body.', avoid: 'Items sit side by side (Cluster).' },
  { name: 'Cluster', id: 'primitives-cluster--default', choose: 'A row that may wrap: button groups, filter bars, tags.', avoid: 'The row must line up in columns (Grid or Table).' },
  { name: 'Grid', id: 'primitives-grid--default', choose: 'Equal items that reflow by width with no breakpoints: cards, stat tiles.', avoid: 'Rows of comparable attributes (Table), or two regions of different weight (Sidebar).' },
  { name: 'Switcher', id: 'primitives-switcher--row', choose: 'Equal items in one row, or one column all at once when the container is narrow: stat tiles, plan cards.', avoid: 'Many items that should reflow into as many columns as fit (Grid).' },
  { name: 'Sidebar', id: 'primitives-sidebar--start', choose: 'A narrow region beside a wider one inside a card, panel or dialog, stacking when space runs out.', avoid: 'A page’s properties rail or sub-nav (PageLayout), or the app’s navigation (AppShell).' },
  { name: 'Center', id: 'primitives-center--default', choose: 'The page column inside AppShell’s main, with a bounded measure and gutters; empty states (intrinsic).', avoid: 'Centring a single control in a row (Cluster justify="center").' },
  { name: 'Cover', id: 'primitives-cover--header-and-footer', choose: 'One block centred vertically in the available height, with a header and footer pinned to the edges.', avoid: 'A signed-out page: AuthLayout already composes it.' },
  { name: 'Frame', id: 'primitives-frame--landscape', choose: 'Media held to a ratio token and cropped to fill: file previews, covers, video.', avoid: 'A person’s picture (Avatar), or a box that holds text.' },
] as const;

const LAYOUTS = [
  { name: 'AppShell', id: 'layouts-appshell--default', choose: 'Every signed-in page: skip link, sidebar (collapsible to an icon rail), header, main.', avoid: 'Signed-out pages (AuthLayout) or a task that takes over the screen (FocusedLayout).' },
  { name: 'PageLayout', id: 'layouts-pagelayout--nav-and-aside', choose: 'Inside a page, below its PageHeader: a section nav at the start, the main column, a named aside at the end.', avoid: 'A one-column page: Center and Stack are enough.' },
  { name: 'AuthLayout', id: 'layouts-authlayout--with-footer', choose: 'Sign-in, sign-up, password reset, and an error page when the app itself may not have loaded.', avoid: 'Any signed-in page, including a signed-in 404 (AppShell).' },
  { name: 'FocusedLayout', id: 'layouts-focusedlayout--with-progress', choose: 'A multi-step task that takes over the screen until it is done or abandoned: setup, a wizard.', avoid: 'A single-page form (AppShell with its footer action bar).' },
] as const;

function Layout() {
  return (
    <DocPage
      title="Layout"
      lead="Four layouts frame a page; eight layout primitives arrange everything inside it. They take gaps, widths and ratios as tokens, so a layout can’t drift off the scale, and they hold no domain knowledge."
    >
      <DocSection title="Which layout" intro="Pick the frame first. Each page starts from a PageHeader inside it.">
        <Table caption="Layouts">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Layout</TableHeaderCell>
              <TableHeaderCell>Choose when</TableHeaderCell>
              <TableHeaderCell>Avoid when</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {LAYOUTS.map((l) => (
              <TableRow key={l.name}>
                <TableCell rowHeader>
                  <StoryLink id={l.id}>{l.name}</StoryLink>
                </TableCell>
                <TableCell>{l.choose}</TableCell>
                <TableCell>{l.avoid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
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
      <PageHeader title="Hardware lease" status={<Badge tone="info">Pending</Badge>} actions={<Button>Edit</Button>} />
      <NavTabs label="Record sections" items={sections} current={href} />
      <PageLayout aside={propertiesCard} asideLabel="Properties">
        <Stack gap="lg">{/* main column: cards */}</Stack>
      </PageLayout>
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
            <>
              Layouts respond to their container, not the viewport. AppShell opens its nav in a Drawer below <code>size.breakpoint.md</code>;
              PageLayout stacks nav, main and aside below <code>size.breakpoint.sm</code>; Switcher stacks below its <code>threshold</code>. To
              see each state, set the gallery’s Width toolbar to Narrow, Medium or Wide: it wraps any story in a container sized from those
              tokens.
            </>,
            <>
              Start every page with a <code>PageHeader</code> (the one h1, status, actions). Breadcrumbs belong to AppShell’s header, not the
              page.
            </>,
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
