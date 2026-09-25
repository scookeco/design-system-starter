import type { Meta, StoryObj } from '@storybook/react-vite';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const TEMPLATE = `
# Accessibility statement for [Product]

[Organisation] wants everyone to be able to use [Product], including people who use a
keyboard, a screen reader, magnification, voice control or other assistive technology.

## Conformance status

[Product] is [fully | partially | not] conformant with the Web Content Accessibility
Guidelines (WCAG) 2.2 at level AA. "Partially conformant" means some parts of the content
don't yet meet the standard; they are listed under Known limitations.

## What we do

- Our design system checks colour contrast, target size, focus visibility behind sticky
  content, accessible sign-in and consistent help automatically on every build.
- We test core tasks with a keyboard only and with [screen readers and browsers] before
  each release.
- [Other measures: training, accessibility in acceptance criteria, an owner for this statement.]

## Known limitations

| What | Why it fails | Criterion | Plan and date |
|---|---|---|---|
| [Feature or content] | [What someone can't do] | [e.g. 1.4.10 Reflow] | [Fix by YYYY-MM] |

## Compatibility

[Product] is designed to work with [the two latest versions of Chrome, Edge, Firefox and
Safari] and [VoiceOver on macOS and iOS, NVDA and JAWS on Windows, TalkBack on Android].
It is not designed for [e.g. Internet Explorer].

## How we assessed it

[Self-assessment | an external audit by [auditor]] on [YYYY-MM-DD], covering [scope: pages
and flows]. The report is available on request.

## Feedback and contact

If you find something you can't use, or need content in another format, tell us:

- Email: [accessibility@example.com]
- [Phone or other channel, with hours]

We reply within [N] working days.

## Enforcement

[Where required by law, name the enforcement or complaints body and how to reach it.]

This statement was prepared on [YYYY-MM-DD] and last reviewed on [YYYY-MM-DD].
`;

function AccessibilityStatement() {
  return (
    <DocPage
      title="Accessibility statement"
      lead="A template for the statement a product publishes about its accessibility. Copy it, replace every [bracketed] part, and keep it true: a statement that overclaims is worse than none."
    >
      <DocSection title="Before you publish">
        <Rules
          items={[
            'Base the conformance status and known limitations on a manual audit, not on a green build alone.',
            <>
              List what the build checks and what it can’t: see <StoryLink id="guides-accessibility-conformance--accessibility-conformance">Accessibility conformance</StoryLink>.
            </>,
            'Every known limitation gets an owner and a date. Review the statement at least once a year and after every major release.',
            'Link it from the app’s help menu and footer, so it sits in the same place on every page.',
          ]}
        />
      </DocSection>
      <DocSection title="Template">
        <Code label="Accessibility statement template">{TEMPLATE}</Code>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Accessibility statement', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const AccessibilityStatementGuide: StoryObj = { name: 'Accessibility statement', render: () => <AccessibilityStatement /> };
