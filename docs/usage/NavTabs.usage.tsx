import { NavTabs, Tab, TabList, TabPanel, Tabs, Text } from '../../src/index';
import type { UsageDoc } from './types';

const sections = [
  { label: 'Overview', href: '/records/r-1001' },
  { label: 'Activity', href: '/records/r-1001/activity' },
  { label: 'Files', href: '/records/r-1001/files' },
];

export const usage: UsageDoc = {
  covers: [NavTabs],
  whenToUse: [
    'Sections of a record or area that are each their own route: Overview, Activity, Files. The URL changes, the section can be bookmarked or opened in a new tab.',
    'Tabs or NavTabs? If choosing one changes the URL, it is `NavTabs` (links, `aria-current="page"`). If it only swaps panels in place on one page, it is `Tabs` (an ARIA tablist).',
    'Place it under the `PageHeader`, above the section’s content.',
  ],
  whenNotToUse: [
    { situation: 'Switching panels in place without changing the URL', instead: '`Tabs`' },
    { situation: 'The app’s areas', instead: 'AppShell’s `Nav`' },
    { situation: 'A long list of categories (settings)', instead: '`Nav` in `PageLayout`’s nav slot' },
  ],
  do: {
    caption: 'Each section is a route: links in a named nav, the current one marked with aria-current.',
    render: () => <NavTabs label="Record sections (do example)" items={sections} current="/records/r-1001/activity" />,
  },
  dont: {
    caption: 'An ARIA tablist for routes: screen readers announce tabs and panels, but each “tab” is really a page change.',
    render: () => (
      <Tabs defaultValue="activity">
        <TabList label="Record sections (don’t example)">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
        </TabList>
        <TabPanel value="overview">
          <Text>Loads /records/r-1001</Text>
        </TabPanel>
        <TabPanel value="activity">
          <Text>Loads /records/r-1001/activity</Text>
        </TabPanel>
      </Tabs>
    ),
  },
  accessibility: [
    'A `nav` landmark named by the required `label`, with `aria-current="page"` on the current link. It is not a tablist: Tab moves link to link, Enter follows.',
    'The current section has a rule and a stronger colour, never colour alone.',
    'On narrow screens the row scrolls sideways instead of wrapping; every link stays reachable by keyboard.',
    'After a client-side section change, product code moves focus or announces the new section, as for any route change.',
  ],
};
