import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function Principles() {
  return (
    <DocPage
      title="Principles"
      lead="Three rules the whole system is built around. Each one is enforced by the build, not by review, so a change that breaks one fails before anyone has to spot it."
    >
      <DocSection title="Tokens only">
        <Text>Every colour, length, radius, shadow, duration and font comes from a token. The token source is the only place a value lives.</Text>
        <Rules
          items={[
            <>
              Use semantic tokens (<code>--color-fg-muted</code>, <code>--space-gap-md</code>), named for intent. Primitives are reference only.
            </>,
            <>
              The only literals allowed are <code>inherit</code>, <code>currentColor</code>, <code>transparent</code>, <code>none</code>,{' '}
              <code>auto</code>, <code>0</code>, <code>1px</code> and <code>100%</code>. Stylelint rejects the rest.
            </>,
            <>Missing a token? Add a semantic one (with a dark value for colours) and regenerate. Never write the literal instead.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Compose, don’t restyle">
        <Text>Pages are compositions of system components inside layout primitives, inside AppShell. Product code has no CSS.</Text>
        <Rules
          items={[
            <>
              Components are closed: no <code>className</code> or <code>style</code>. A new look is a new variant in the component, available to
              everyone.
            </>,
            <>Layout primitives own spacing between things. Children never bring outer margins.</>,
            <>A repeated override is a missing variant. Propose it instead of copying the override.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Accessibility built in">
        <Text>The system carries the parts of accessibility that can be decided once, so product code can’t get them wrong.</Text>
        <Rules
          items={[
            <>Semantic colour pairs meet WCAG 2.2 AA in light and dark, checked in a test.</>,
            <>Components require their accessible names as props, and use native elements and Radix behaviour for keyboard and focus.</>,
            <>Every story in this gallery, and every Docs tab, is checked with axe in the visual suite.</>,
            <>What’s left to product code (labels, headings, focus after navigation) is listed in the Accessibility guide.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Principles', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const PrinciplesGuide: StoryObj = { name: 'Principles', render: () => <Principles /> };
