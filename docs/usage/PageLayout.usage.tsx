import { Card, CardBody, CardHeader, Nav, PageLayout, Sidebar, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [PageLayout],
  whenToUse: [
    'The body of a page below its `PageHeader`, when the page has a second region: a record’s properties rail (`aside`) or a section sub-nav (`nav`).',
    '`aside` is complementary content at the inline end, rendered as `<aside>` and named by the required `asideLabel`.',
    '`nav` is section navigation at the inline start. Pass a `<Nav label="…">`: it is a nav landmark, not an aside, so the slot adds no landmark of its own.',
    'Below the `size.breakpoint.sm` container width the regions stack in reading order: nav, main, aside.',
  ],
  whenNotToUse: [
    { situation: 'A page with one column', instead: 'the page’s `Center` column and a `Stack`, with no PageLayout' },
    { situation: 'The app’s primary navigation', instead: 'AppShell’s `nav` slot' },
    { situation: 'Two regions inside a card or a panel', instead: 'the `Sidebar` primitive' },
  ],
  do: {
    caption: 'Main content first; the properties rail is a named aside at the inline end.',
    render: () => (
      <PageLayout
        aside={
          <Card>
            <CardHeader title="Properties" level={4} />
          </Card>
        }
        asideLabel="Properties (do example)"
      >
        <Card>
          <CardBody>
            <Text>Summary, activity and files.</Text>
          </CardBody>
        </Card>
      </PageLayout>
    ),
  },
  dont: {
    caption: 'A sub-nav hand-placed with Sidebar and wrapped in an aside: navigation announced as complementary content, and a gap and width of its own.',
    render: () => (
      <Sidebar
        as="aside"
        sideWidth="sm"
        side={<Nav label="Settings (don’t example)" sections={[{ items: [{ label: 'Profile', href: '/settings/profile' }] }]} />}
      >
        <Card>
          <CardBody>
            <Text>Profile fields.</Text>
          </CardBody>
        </Card>
      </Sidebar>
    ),
  },
  accessibility: [
    'The aside is a complementary landmark, and `asideLabel` is required whenever `aside` is set (a type error otherwise).',
    'The nav slot relies on `Nav`’s own labelled nav landmark; nothing is nested or duplicated.',
    'The main column is a plain region: the page is already inside AppShell’s `main`.',
    'Regions stack in DOM order when narrow, so reading and focus order never change with width, and nothing is lost at 400% zoom.',
  ],
};
