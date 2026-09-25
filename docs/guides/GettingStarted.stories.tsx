import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function GettingStarted() {
  return (
    <DocPage title="Getting started" lead="Three steps: bring the system in, load its styles once, and render every signed-in page inside AppShell.">
      <DocSection title="1. Install">
        <Text>
          The system is one folder in this repo until a second app needs it as a versioned package. Install its dependencies and check
          that everything passes before you build on it.
        </Text>
        <Code label="Install and check">{`
npm ci
npx playwright install chromium   # once, for the visual and axe suite
npm run check                     # tokens, types, lint, tests, rules, build
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
          <Heading level={1}>Records</Heading>
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
      <DocSection title="Then">
        <Rules
          items={[
            <>Pick the page archetype and copy its example: see Page archetypes.</>,
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
