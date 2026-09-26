import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const SURFACES = [
  {
    surface: 'Inline suggestion',
    parts: 'Suggestion, AiMarker, Kbd',
    choose: 'The next words of a field are predictable and taking them is cheap (Tab).',
    avoid: 'The result is long enough that accepting it is a decision: use a reviewed block or ReviewChanges.',
    id: 'examples-create-with-ai--suggestion-ready',
    example: 'Create with AI',
  },
  {
    surface: 'Side panel',
    parts: 'AssistantPanel, ChatThread, Message, Composer, StreamingText, Citation',
    choose: 'Questions about the page the person is on, with the page still in view.',
    avoid: 'A one-shot transform they’d accept or reject outright: put that action beside the field.',
    id: 'examples-record-copilot--answered',
    example: 'Record copilot',
  },
  {
    surface: 'Proposed changes',
    parts: 'ReviewChanges, Disclosure or Accordion (steps), AiMarker',
    choose: 'The AI would change data: show every change as a diff, applied only after review.',
    avoid: 'Never skip it for writes, however small.',
    id: 'examples-ai-bulk-changes--proposed',
    example: 'AI bulk changes',
  },
  {
    surface: 'Full chat page',
    parts: 'ChatThread (scroll="page"), Composer in AppShell’s footer, history in PageLayout’s nav',
    choose: 'Open-ended, multi-turn questions that span the workspace.',
    avoid: 'Anything tied to one record or one field: keep the AI where the work is.',
    id: 'examples-assistant-chat--with-history',
    example: 'Assistant chat',
  },
] as const;

const FAILURES = [
  { state: 'Refused: out of scope', says: 'One line: what it can help with instead. Not an error, no Retry.', id: 'examples-assistant-chat--refusal' },
  { state: 'Refused: permission', says: 'The same denial reason a disabled button shows, and who can change it.', id: 'examples-ai-bulk-changes--as-viewer-refused' },
  { state: 'Rate limited (429)', says: 'The server’s message, with when to try again; Retry.', id: 'examples-record-copilot--rate-limited' },
  { state: 'Content filter', says: 'The text so far stays; the filter is named; Retry or rephrase.', id: 'examples-record-copilot--content-filtered' },
  { state: 'Connection dropped', says: 'The text so far stays; “Nothing was changed”; Retry.', id: 'examples-record-copilot--connection-dropped' },
  { state: 'Stopped by the person', says: 'The text so far stays, noted as stopped; Retry.', id: 'examples-assistant-chat--stopped' },
] as const;

function AiPatterns() {
  return (
    <DocPage
      title="AI patterns"
      lead="AI in this system is a set of shared parts, not a separate product: streaming answers, inline suggestions, citations, proposed changes with undo, and one assistant that acts only as the signed-in person. Define them once here so every team doesn’t invent its own."
    >
      <DocSection title="Which surface" intro="Put the AI where the work is. The manual path stays beside it, equally visible.">
        <Table caption="AI surfaces and their examples">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Surface</TableHeaderCell>
              <TableHeaderCell>Choose when</TableHeaderCell>
              <TableHeaderCell>Avoid when</TableHeaderCell>
              <TableHeaderCell>Parts</TableHeaderCell>
              <TableHeaderCell>Example</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SURFACES.map((s) => (
              <TableRow key={s.surface}>
                <TableCell rowHeader>{s.surface}</TableCell>
                <TableCell>{s.choose}</TableCell>
                <TableCell>{s.avoid}</TableCell>
                <TableCell>{s.parts}</TableCell>
                <TableCell>
                  <StoryLink id={s.id}>{s.example}</StoryLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>

      <DocSection title="Provenance and citations">
        <Rules
          items={[
            <>
              Every claim that matters cites its source. <code>StreamingText</code> renders numbered citations through a <code>Citation</code>{' '}
              renderer; the <code>SourcesList</code> under the answer says where each came from (a record field, an activity entry, a list)
              and links to it. A citation is a link from the moment it appears: the mock sends sources before tokens.
            </>,
            <>
              Show the work: tool activity (“Read Master cleaning agreement and its activity”, “Found 18 overdue records you can see”) as
              collapsed <code>Disclosure</code>s above the answer, so the person can check what it looked at.
            </>,
            <>
              Mark what the AI wrote with <code>AiMarker</code> (text, never colour alone) until a person accepts or edits it. Assistant turns
              carry it in their header.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Consent before acting, and undo after">
        <Rules
          items={[
            <>
              The AI suggests; the person decides. Suggestions are ghost text that isn’t the field’s value until Tab or Accept. Changes to
              data are proposals shown in <code>ReviewChanges</code>; nothing is applied until the person accepts changes and chooses Apply.
            </>,
            <>
              Applying goes through the same named mutations as a person’s own edits (<code>moveRecord</code>), so it is permission-checked,
              versioned (a stale proposal gets a 409, reported per change) and patches the cache like any write.
            </>,
            <>
              Keep what was there before. One Undo restores it: the field’s previous text, or every applied record moved back with the
              version its move returned.
            </>,
            <>Stop is always available while an answer arrives, and what arrived stays.</>,
          ]}
        />
      </DocSection>

      <DocSection title="What the AI may and may not do" intro="The assistant has no permissions of its own. It is the person, typing faster.">
        <Rules
          items={[
            <>
              <strong>Reads</strong> only what the person can see: the mock server filters with the same <code>canSee</code> as the list, so a
              viewer’s assistant never sees drafts, and it reads only its own workspace’s partition; another workspace’s id is not found.
            </>,
            <>
              <strong>Proposes</strong> only what the person could do by hand: a change is proposed only where{' '}
              <code>can(grant, &apos;record:move&apos;, record)</code> holds. Without the capability it refuses with the same denial reason a
              disabled button shows.
            </>,
            <>
              <strong>Asks</strong> the same predicate before sending: <code>useAssistant</code> and <code>useDraftSuggestion</code> refuse
              with <code>can</code> before any request, controls that start AI actions are disabled with the reason, AI pages have route
              guards, and every AI route declares its capability on the server.
            </>,
            <>
              <strong>Never</strong> writes on its own, never widens a query past the person’s scope, and never puts another workspace’s data
              in its context. Requests carry ids and filters, not data: the server reads the data itself, as the person.
            </>,
          ]}
        />
        <Code label="Where the checks are">{`
client    can(grant, 'record:read')  before useAssistant sends        src/app/model/ai.ts
          can(grant, 'record:create') before a draft suggestion       src/app/model/ai.ts
          usePermission(...)          disables Propose / Suggest      src/examples/*
route     guard: record:read | record:create | record:move            src/examples/routes.tsx
server    handle('record:read', ...)  every AI route                  src/app/mocks/ai.ts
          canSee(grant, record)       every record it reads
          can(grant, 'record:move', record)  every change it proposes
apply     moveRecord refuses with can() before sending; the server checks again
`}</Code>
      </DocSection>

      <DocSection title="Honest failure and refusals" intro="Each failure has its own words and next step. None of them invents an answer.">
        <Table caption="Failure states and what they say">
          <TableHead>
            <TableRow>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>What it says</TableHeaderCell>
              <TableHeaderCell>Example</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {FAILURES.map((f) => (
              <TableRow key={f.state}>
                <TableCell rowHeader>{f.state}</TableCell>
                <TableCell>{f.says}</TableCell>
                <TableCell>
                  <StoryLink id={f.id}>Open</StoryLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Text>
          A persistent, quiet disclaimer sits under every composer: “AI can make mistakes. Check important info.”
        </Text>
      </DocSection>

      <DocSection title="Streaming and accessibility">
        <Rules
          items={[
            <>
              <code>ChatThread</code> is not a live region (<code>role=&quot;log&quot;</code> would read every token). Each answer’s{' '}
              <code>StreamingText</code> owns one polite status, present from mount: “Generating…”, then each sentence or paragraph once it
              is complete, then “Stopped” if stopped. It never re-reads the whole answer, and history isn’t announced.
            </>,
            <>
              A suggestion is announced once when it is complete (“Suggestion ready. Press Tab to accept or Escape to dismiss.”), and its text
              is in the field’s description. The field’s value reads as what was typed.
            </>,
            <>
              The caret and the thinking dots are decorative and hold still under reduced motion (<code>motion.pulse</code> is 0). Every AI
              action has a keyboard path and a single-pointer path (Accept and Dismiss beside Tab and Esc; Widen beside dragging the panel).
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Model output is untrusted input">
        <Rules
          items={[
            <>
              Answers render through the system’s own Markdown renderer, which builds React elements only: no{' '}
              <code>dangerouslySetInnerHTML</code>, raw HTML shows as text, links are http(s), mailto or in-app only, images are never loaded
              (an image URL is a way to leak what’s on screen), and headings become bold text.
            </>,
            <>
              Structured output is validated before it is used: every streamed event is parsed with zod at the boundary, and a malformed one
              ends the answer as an error rather than rendering half of it. Proposed changes are re-checked by the write path when applied.
            </>,
            <>Assume prompt injection: content the AI reads can carry instructions, so it can’t act without the person’s review.</>,
          ]}
        />
      </DocSection>

      <DocSection title="Testing AI surfaces">
        <Rules
          items={[
            <>
              The mock assistant (<code>src/app/mocks/ai.ts</code>) is scripted and seeded: the same question gets the same answer, split into
              the same tokens. With the gallery’s latency at 0 (the visual suite) an answer completes at once.
            </>,
            <>
              Pin other moments with overrides: <code>aiHoldAfter(n)</code> (mid-stream; tag the story <code>busy</code>),{' '}
              <code>aiRateLimited</code>, <code>aiContentFiltered</code>, <code>aiNetworkDropped</code>, <code>aiMalformed</code>,{' '}
              <code>aiNoHistory</code>. Component stories take their text as props, so any moment can be shown without a server.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/AI patterns', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const AiPatternsGuide: StoryObj = { name: 'AI patterns', render: () => <AiPatterns /> };
