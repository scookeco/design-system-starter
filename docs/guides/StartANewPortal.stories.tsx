import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function StartANewPortal() {
  return (
    <DocPage
      title="Start a new portal"
      lead="A portal is a one-time copy of this repo, made with GitHub’s “Use this template”, and then trimmed by deleting what it doesn’t need. Nothing flows back from the starter later. Every check keeps working after a trim, and the checks name what else to edit. The README’s “Start a new portal” section has the same steps with every file and command."
    >
      <DocSection title="1. Create and rename">
        <Stack as="ol" gap="xs">
          <li>
            Use this template, allow squash merging only, and set the clone’s commit email to your GitHub noreply address before the first
            commit.
          </li>
          <li>
            Rename <code>name</code> and <code>description</code> in <code>package.json</code> (then <code>npm install --package-lock-only</code>
            ), and the first heading of the README and <code>CLAUDE.md</code>.
          </li>
          <li>
            Change the brand colours as{' '}
            <StoryLink id="guides-theming-and-adding-a-brand--theming-guide">Theming and adding a brand</StoryLink> describes: a new ramp, the
            brand-carrying semantic tokens pointed at it, <code>npm run tokens</code>, and the contrast test.
          </li>
        </Stack>
      </DocSection>
      <DocSection title="2. Trim, one example at a time" intro="Delete, then let the checks lead you to the rest.">
        <Code label="The trim loop">{`
# 1. delete src/examples/<Name>.tsx and <Name>.stories.tsx (and the extra files the README lists)
# 2. delete its rows in src/examples/routes.tsx
npm run typecheck   # names every file still importing it: delete those tests or describe blocks
npx vitest run      # names the rest: dead links, guide links, README and CLAUDE.md lines
npm run manifest    # regenerate the agent files
npm run lint        # imports left unused
`}</Code>
        <Rules
          items={[
            <>
              A link that now leads nowhere (a nav item, a palette action, a “g then …” jump, <code>HOME</code>) fails the route table test,
              naming the path.
            </>,
            <>
              A guide that links to a deleted example fails the story-link test. Add the example’s title id to <code>REMOVED_EXAMPLES</code> in{' '}
              <code>docs/ui/removedExamples.ts</code>: its links become plain text, and{' '}
              <StoryLink id="guides-page-archetypes--page-archetypes-guide">Page archetypes</StoryLink> says it isn’t in this repo. Every other
              link is still checked.
            </>,
            <>
              A README or <code>CLAUDE.md</code> line naming a deleted file, or telling agents to copy a deleted example, fails the repo docs test.
            </>,
            <>
              The app layer behind a deleted example can stay until you replace it: no page imports it. The records trio (list, record, create
              and edit), the sign-in page, the error pages and the shell stay: the checks run on them. Rename them into your first resource.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="3. Never delete">
        <Rules
          items={[
            <>
              The system: <code>tokens/</code>, <code>src/styles/</code>, <code>src/primitives/</code>, <code>src/components/</code>,{' '}
              <code>src/layouts/</code>, <code>src/format/</code>.
            </>,
            <>
              The checks: <code>scripts/</code>, <code>fixtures/</code>, <code>.storybook/</code>, the CI workflows, the visual harness in{' '}
              <code>tests/visual/</code>, and every unit test that checks the system or the repo rather than one example. The only tests
              you delete are those of an example you deleted.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="4. The first pull request">
        <Rules
          items={[
            <>
              The copy carries the starter’s Linux baselines, and a rebrand changes them. Run <strong>Update visual baselines</strong> on the
              first branch: it regenerates every baseline and drops those of deleted stories. Then re-run CI, and merge once it’s green.
            </>,
            <>
              Then protect <code>main</code>, requiring <strong>Check (tokens, types, lint, tests, rules, build)</strong> and{' '}
              <strong>Visual regression and axe</strong>. A branch protection rule offers only checks that have run recently, so this comes after
              the first run. See{' '}
              <StoryLink id="guides-testing--testing-guide">Testing</StoryLink> for how baselines change from then on.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="5. The real backend, resource by resource">
        <Rules
          items={[
            <>
              <strong>The app entry:</strong> <code>index.html</code> loads <code>src/main.tsx</code>, which calls <code>startApp</code> in{' '}
              <code>src/bootstrap.tsx</code>: session first, then <code>ExampleApp</code> in <code>LocaleProvider</code> and{' '}
              <code>AppProviders</code>. <code>npm run dev:app</code> serves it; <code>npm run build:app</code> builds <code>dist-app/</code>. Deep
              links need a history fallback on your host.
            </>,
            <>
              <code>VITE_API_BASE_URL</code> becomes <code>configureApi(&#123; baseUrl &#125;)</code> in <code>src/app/api/client.ts</code>, set once
              before the app mounts. Requests, the assistant’s stream and live events all build their URLs from it.
            </>,
            <>
              The zod schemas stay the contract: build each endpoint to its schema, and the client parses its answers as it parsed the mock’s.
              A payload that breaks the schema is an error state, never data. See{' '}
              <StoryLink id="guides-data--data-guide">Data</StoryLink>.
            </>,
            <>
              Move one resource at a time. <code>VITE_API_MOCKS</code> (on in <code>dev:app</code>, off in a build unless set) starts MSW’s worker,
              which answers the routes it knows and lets the rest reach the backend. The gallery and the tests keep MSW, so every state stays
              reproducible. <code>tests/unit/api-base.test.tsx</code> shows the records list served by a real HTTP server while the mocks answer
              the rest.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="6. Where sign-in plugs in" intro="No provider is chosen yet. Whichever it is, it meets the app in four places.">
        <Rules
          items={[
            <>
              <strong>Before mount:</strong> in <code>startApp</code>, the provider signs the person in, then <code>getSession()</code> loads the session that{' '}
              <code>AppProviders</code> takes. Its <code>signedOut</code> prop renders the sign-in page.
            </>,
            <>
              <strong>Every request:</strong> <code>request()</code> in <code>client.ts</code> is the one place for cookies (
              <code>credentials</code>) or an <code>Authorization</code> header.
            </>,
            <>
              <strong>Sign-out:</strong> <code>signOut</code> in <code>src/app/session.tsx</code> clears the cache, queued writes and drafts; the
              provider’s own sign-out goes there too.
            </>,
            <>
              <strong>A 401:</strong> today it is the page’s error state. With a provider, send it back to sign-in, for example from the query
              cache’s <code>onError</code>.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="7. Keep the agent files true">
        <Text>
          After a trim, fix the lines the repo docs test names in <code>CLAUDE.md</code> (the examples agents are told to copy, the repo map) and
          the README, then run <code>npm run manifest</code>. <code>llms.txt</code>, <code>llms-full.txt</code> and the manifest are generated, and{' '}
          <code>npm run check</code> fails while they’re stale. See <StoryLink id="guides-agents--agents-guide">Agents</StoryLink>.
        </Text>
      </DocSection>
    </DocPage>
  );
}

const meta = {
  title: 'Guides/Start a new portal',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen', summary: 'Copy the template, rename, trim, then plug in a backend' },
} satisfies Meta;
export default meta;

export const StartANewPortalGuide: StoryObj = { name: 'Start a new portal', render: () => <StartANewPortal /> };
