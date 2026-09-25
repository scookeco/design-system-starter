import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Text } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const RUNGS = [
  {
    title: '1. Template: is it a new page?',
    body: 'Copy the golden example for its archetype and render it inside AppShell. Compose existing parts. No new component.',
  },
  {
    title: '2. Variant: does an existing component need a new look?',
    body: 'Add a value to its closed variant vocabulary, with a story. A new status extends the status-to-tone map; it doesn’t add a badge.',
  },
  {
    title: '3. Component: is it a genuinely new region or intent?',
    body: 'Add a component with a focused contract, composed from existing parts where possible: closed props, a required accessible name, a story per variant and state, and a usage doc.',
  },
  {
    title: '4. Primitive: can it not be expressed as a composition at all?',
    body: 'The highest bar: domain-agnostic, token-driven. It changes tokens, component styles and the agent rules in the same pull request.',
  },
] as const;

function DecisionLadder() {
  return (
    <DocPage title="Decision ladder" lead="Before building anything new, walk the ladder from the top and stop at the first yes. Most needs stop at the first rung.">
      <DocSection title="The ladder">
        <Stack as="ol" gap="md">
          {RUNGS.map((rung) => (
            <li key={rung.title}>
              <Stack gap="2xs">
                <Text as="span">
                  <strong>{rung.title}</strong>
                </Text>
                <Text as="span" tone="muted">
                  {rung.body}
                </Text>
              </Stack>
            </li>
          ))}
        </Stack>
      </DocSection>
      <DocSection title="Proposing a token">
        <Rules
          items={[
            <>Pick the tier. Semantic is almost always right; a primitive only for a new raw value; a component token only for a per-part override hook.</>,
            <>
              Name it for intent (<code>color.fg.muted</code>, not <code>color.gray-600</code>), give colours a dark value, and add a{' '}
              <code>$description</code>: it becomes the “use for” note on the Foundations pages.
            </>,
            <>
              Run <code>npm run tokens</code> and commit the source with the generated files. A new text/background pair joins the contrast
              pairs.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="Proposing a component or variant">
        <Rules
          items={[
            <>Write down the use cases (at least two real ones), the API, an owner and what existing screens would move to it.</>,
            <>A second use is a signal to review for promotion; three distinct uses usually confirm the abstraction is stable.</>,
            <>Ship it with stories for every variant and state, a usage doc on its Docs tab, and green visual and axe runs.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Decision ladder', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const DecisionLadderGuide: StoryObj = { name: 'Decision ladder', render: () => <DecisionLadder /> };
