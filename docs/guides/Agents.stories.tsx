import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../../src/index';
import claudeMd from '../../CLAUDE.md?raw';
import { extractAgentRules } from '../../scripts/checks/agent-rules';
import { Code } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

// The rules come from CLAUDE.md through the same extractor the manifest uses, never from the
// generated files: this page is itself rendered into llms-full.txt.
const RULES = extractAgentRules(claudeMd);

function Agents() {
  return (
    <DocPage
      title="Agents"
      lead="Coding agents read the system from three files at the repo root, generated from the code. Point an agent at llms.txt first: it holds the rules and links to everything else."
    >
      <DocSection title="The three files">
        <Rules
          items={[
            <>
              <code>llms.txt</code> is the entry point, small enough to read whole at the start of every session (under 8 KB). It follows the
              llms.txt convention: the name, a summary, the agent rules, then one line per guide, foundation page, component, primitive,
              layout, utility and golden example, each linking to its file.
            </>,
            <>
              <code>llms-full.txt</code> adds every component’s props, variants and states, its usage doc (with the do and don’t code), its
              stories and tokens, then every guide as Markdown and every semantic token with its light and dark value. Give it to an agent
              that takes a whole document as context.
            </>,
            <>
              <code>design-system.manifest.json</code> holds the same facts as data, for tools and targeted lookups. Its schema,{' '}
              <code>design-system.manifest.schema.json</code>, documents every field.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="How an agent should use them">
        <Rules
          items={[
            <>Read llms.txt before any UI work and follow its rules. They are the rules below, word for word.</>,
            <>
              Building a page: find its archetype under Examples and copy that golden example’s structure. Never copy another screen.
            </>,
            <>
              Before using a component, look it up: its props with their defaults and allowed values, its variants, and “when not to use”,
              which names what to use instead.
            </>,
            <>
              Need a value: find the semantic token by what it is for (each token carries a description and its light and dark values). Never
              write a literal.
            </>,
            <>
              Import every <code>component</code>, <code>primitive</code>, <code>layout</code> and <code>utility</code> from{' '}
              <code>src/index.ts</code>; a <code>type-only</code> export with <code>import type</code>. No component accepts{' '}
              <code>className</code> or <code>style</code>: the manifest records that for every one.
            </>,
            <>Agent output goes through the same gates as anyone’s: lint, <code>npm run check</code> and the gallery.</>,
          ]}
        />
        <Code label="Looking things up in the manifest">{`
# One component: its props, variants, and what to use instead
jq '.exports[] | select(.name == "Button") | {props: [.props[].name], variants, instead: [.usage.whenNotToUse[].instead]}' design-system.manifest.json

# Which units read a token
jq -r '.exports[] | select(.unit.tokens // [] | index("color.fg.muted")) | .name' design-system.manifest.json

# Text colours, with what each is for
jq -c '.tokens | to_entries[] | select(.key | startswith("color.fg.")) | {token: .key, light: .value.value, dark: .value.modes.dark, use: .value.description}' design-system.manifest.json
`}</Code>
      </DocSection>
      <DocSection title="What the manifest holds">
        <Rules
          items={[
            <>
              <code>exports</code>: every public export of <code>src/index.ts</code>, with its kind, source file, status and description. A
              part (<code>TableRow</code>) names the unit it belongs to; a props type names its component.
            </>,
            <>
              For components, primitives and layouts: props (TypeScript type, required, default, description, allowed values), the React DOM
              attributes they pass through, the closed styling API, variants and states, the usage doc, story ids, the units it composes and
              every token it reads.
            </>,
            <>
              <code>tokens</code>: every semantic and component token with its CSS variable, value, dark value, description and alias chain.
            </>,
            <>
              <code>guides</code>, <code>foundations</code> and <code>examples</code> with a one-line summary each; <code>rules</code>; and{' '}
              <code>commands</code>, the repo’s scripts.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="The agent rules" intro="Copied verbatim from CLAUDE.md, between its agent-rules markers. Edit them there.">
        <Code label="Agent rules">{RULES}</Code>
      </DocSection>
      <DocSection title="Keeping them current">
        <Text>
          Nothing in the three files is written by hand. <code>npm run manifest</code> regenerates them, and <code>npm run check</code> runs{' '}
          <code>manifest:check</code>, which fails when any committed file differs from a fresh build.
        </Text>
        <Rules
          items={[
            <>
              They go stale when an export, a prop, a JSDoc comment, a story, a usage doc, a guide, the token usage map, the agent rules or the
              README’s Scripts table changes. Run <code>npm run manifest</code> and commit the result with the change.
            </>,
            <>
              A description comes from the JSDoc on the export, or else the first “when to use” line of its usage doc. To improve an entry,
              improve those, never the generated files.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Agents', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const AgentsGuide: StoryObj = { name: 'Agents', render: () => <Agents /> };
