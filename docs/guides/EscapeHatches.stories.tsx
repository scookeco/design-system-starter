import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../../src/index';
import { Code } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function EscapeHatches() {
  return (
    <DocPage
      title="Escape hatches"
      lead="Every system component and primitive takes UNSAFE_className and UNSAFE_style. They exist so a deadline never forces a fork, and they are loud on purpose."
    >
      <DocSection title="When an escape hatch is acceptable">
        <Rules
          items={[
            <>A shipping deadline, and a variant proposal is already open for the look you need.</>,
            <>Integrating third-party or legacy markup that can’t be changed yet.</>,
            <>A one-off experiment behind a flag that will be removed or promoted.</>,
          ]}
        />
        <Text>Not acceptable: matching a mock that differs from the system, adjusting spacing, or anything a variant or token would cover.</Text>
      </DocSection>
      <DocSection title="The required comment">
        <Text>
          Consumer code can’t use an <code>UNSAFE_</code> prop without an ESLint disable, and the disable needs a description. Write the
          reason, an owner and a removal condition:
        </Text>
        <Code label="Escape hatch comment">{`
{/* eslint-disable-next-line no-restricted-syntax -- matches the partner widget's header height; owner: payments; remove when: Card gets a compact variant */}
<Card UNSAFE_className="partner-card">…</Card>
`}</Code>
      </DocSection>
      <DocSection title="Keeping them rare">
        <Rules
          items={[
            <>Count the disables. A rising count is drift made visible; review it like any other health metric.</>,
            <>The same override twice is a missing variant. Propose it and remove both overrides when it lands.</>,
            <>When the removal condition is met, the escape hatch goes in the same pull request as its replacement.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Escape hatches', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const EscapeHatchesGuide: StoryObj = { name: 'Escape hatches', render: () => <EscapeHatches /> };
