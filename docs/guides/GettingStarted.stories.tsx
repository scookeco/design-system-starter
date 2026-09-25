import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function GettingStarted() {
  return (
    <DocPage
      title="Getting started"
      lead="Five steps: bring the system in, load its styles once, render every signed-in page inside AppShell, route its links through your router, and set the reader’s locale."
    >
      <DocSection title="1. Install">
        <Text>
          The system is one folder in this repo until a second app needs it as a versioned package. Install its dependencies and check
          that everything passes before you build on it.
        </Text>
        <Code label="Install and check">{`
npm ci
npx playwright install chromium   # once, for the visual and axe suite
npm run check                     # tokens, types, lint, tests, rules, build, size budgets
npm run dev                       # this gallery on http://localhost:6006
`}</Code>
      </DocSection>
      <DocSection title="2. Import from the public entry">
        <Text>
          Import components, layouts and primitives from <code>src/index.ts</code> only. It loads the stylesheet first, so the cascade
          layer order is declared before any component style. A built app imports <code>dist/index.js</code> and{' '}
          <code>dist/styles.css</code> instead.
        </Text>
        <Code label="Imports">{`
import { AppShell, Button, Stack, Heading } from '../index';   // the public entry

// Blocked by lint: deep imports, and vendor UI outside the system.
// import { Button } from '../components/Button/Button';
// import { Dialog } from 'radix-ui';
`}</Code>
      </DocSection>
      <DocSection title="3. Wrap the page in AppShell">
        <Text>
          Define the shell once for the app: brand, one nav config, one account menu. Each page passes where it is and its content. Never
          rebuild the frame.
        </Text>
        <Code label="A page inside the shell">{`
export function RecordsPage() {
  return (
    <AppShell brand="Acme" nav={<Nav label="Main" sections={NAV} current="/records" />} userMenu={accountMenu}>
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader title="Records" actions={<Button icon="plus">New record</Button>} />
          {/* the page */}
        </Stack>
      </Center>
    </AppShell>
  );
}
`}</Code>
        <Text>
          The golden examples do exactly this through one shared shell: start from{' '}
          <StoryLink id="examples-list-page--default">the list page example</StoryLink>.
        </Text>
      </DocSection>
      <DocSection title="4. Route links through your router">
        <Text>
          System links render a plain <code>&lt;a&gt;</code> by default. Give the app’s router link to <code>LinkProvider</code> once, at
          the root, and <code>Link</code>, <code>Nav</code>, <code>NavTabs</code> and <code>Breadcrumbs</code> all navigate client-side.
          The adapter takes <code>href</code>, spreads every other prop onto the anchor and forwards <code>ref</code>.
        </Text>
        <Code label="React Router">{`
import { Link as RouterLinkBase } from 'react-router';
import { LinkProvider, type LinkComponentProps } from '../index';

// Defined once, outside any component, so its identity never changes.
function AppLink({ href, ref, ...rest }: LinkComponentProps) {
  return <RouterLinkBase to={href} ref={ref} {...rest} />;
}

export function App() {
  return (
    <LinkProvider component={AppLink}>
      <Routes>{/* every page, each inside AppShell */}</Routes>
    </LinkProvider>
  );
}
`}</Code>
        <Code label="Next.js (App Router)">{`
import NextLink from 'next/link';

function AppLink(props: LinkComponentProps) {
  return <NextLink {...props} />;   // already takes href and forwards ref
}
`}</Code>
        <Text>
          Modified clicks (new tab, new window) keep working, because the router link is still an anchor with a real <code>href</code>.
        </Text>
      </DocSection>
      <DocSection title="5. Set the locale and time zone">
        <Text>
          Wrap the app once in <code>LocaleProvider</code> with the signed-in person’s locale and time zone (a profile setting that
          defaults from the browser). Then format every value a person reads with <code>useFormat()</code>. System components that show
          numbers, such as Pagination, follow it too.
        </Text>
        <Code label="Locale and formats">{`
<LocaleProvider locale={user.locale} timeZone={user.timeZone}>
  <LinkProvider component={AppLink}>{/* the app */}</LinkProvider>
</LocaleProvider>

const format = useFormat();
format.money(1_250_050, 'EUR');   // "€12,500.50" in en-US, "12.500,50 €" in de-DE
format.date('2026-09-12');        // a calendar date: never shifts by time zone
format.relative(record.updatedAt);  // "3 days ago"
`}</Code>
        <Text>
          Data is the app’s job, not the system’s: the examples read and write through <code>src/app</code> (a query cache, named
          mutations, URL state). The Data guide explains that layer.
        </Text>
      </DocSection>
      <DocSection title="Then">
        <Rules
          items={[
            <>Pick the page archetype and copy its example: see Page archetypes.</>,
            <>Wire its data the way the examples do: see Data.</>,
            <>Style nothing. If a component doesn’t look right for the job, walk the Decision ladder.</>,
            <>
              Before a pull request: <code>npm run check</code>, then the visual and axe suite (<code>npm run test:visual</code>).
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Getting started', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const GettingStartedGuide: StoryObj = { name: 'Getting started', render: () => <GettingStarted /> };
