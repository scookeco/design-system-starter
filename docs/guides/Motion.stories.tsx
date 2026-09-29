import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../../src/index';
import { formatValue, reducedMotionValue, token, varEntries } from '../foundations/tokens';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

function Motion() {
  const durations = varEntries(vars.motion, 'motion');
  const easings = varEntries(vars.ease, 'ease');
  return (
    <DocPage
      title="Motion"
      lead="Motion gives feedback and shows where something came from. It is short, eased, built from tokens, and it gives way to the reduced-motion preference: nothing in the product depends on seeing it move."
    >
      <DocSection title="Durations" intro="From the token source. The reduced-motion column is what each token becomes under prefers-reduced-motion: reduce.">
        <Table caption="Motion durations">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Reduced motion</TableHeaderCell>
              <TableHeaderCell>Use for</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {durations.map(({ path, ref }) => (
              <TableRow key={path}>
                <TableCell rowHeader>
                  <code>{ref.slice(4, -1)}</code>
                </TableCell>
                <TableCell>
                  <code>{formatValue(path)}</code>
                </TableCell>
                <TableCell>{reducedMotionValue(path) ?? 'Unchanged'}</TableCell>
                <TableCell>{token(path).description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Easings">
        <Table caption="Easing tokens">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Use for</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {easings.map(({ path, ref }) => (
              <TableRow key={path}>
                <TableCell rowHeader>
                  <code>{ref.slice(4, -1)}</code>
                </TableCell>
                <TableCell>{token(path).description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Text>
          Curves and values are drawn on <StoryLink id="foundations-elevation-and-motion--elevation-and-motion">Foundations/Elevation and motion</StoryLink>.
          Things arriving decelerate; things leaving accelerate, and leave a little faster than they came.
        </Text>
      </DocSection>
      <DocSection title="Writing a transition" intro="Longhands, with a duration and an easing token. The shorthand and literal durations fail lint, and a literal would not collapse under reduced motion.">
        <Code label="Transition">{`
.toggle {
  transition-property: background-color, border-color, color;
  transition-duration: var(--motion-fast);
  transition-timing-function: var(--ease-standard);
}
`}</Code>
      </DocSection>
      <DocSection title="Entering" intro="Overlays fade in from @starting-style: the surface declares its transition, and the starting style is where it comes from. No script, and the behaviour library underneath doesn’t know.">
        <Code label="Entry transition">{`
.popover {
  transition-property: opacity;
  transition-duration: var(--motion-base);
  transition-timing-function: var(--ease-enter);
}

@starting-style {
  .popover { opacity: 0; }
}
`}</Code>
        <Rules
          items={[
            <>Fade with <code>opacity</code>; a toast also rises from below its own height and a drawer slides in from its edge (<code>translate</code>, flipped for right-to-left).</>,
            <>Leaving is instant. The person asked for it to go, and the page behind is what they want next.</>,
            <>A browser without <code>@starting-style</code> ignores it and the overlay appears at once: the fallback is the old behaviour.</>,
          ]}
        />
      </DocSection>
      <DocSection title="View transitions" intro="When a whole view changes (the example app’s routes, a list switching between table and board), the page cross-fades instead of jumping.">
        <Rules
          items={[
            <>
              Only through <code>withViewTransition</code> in <code>src/app/viewTransition.ts</code>. It runs the update inside{' '}
              <code>document.startViewTransition</code> when the browser has it and the person hasn’t asked for reduced motion, and directly
              otherwise.
            </>,
            <>
              How it looks is the system’s: <code>src/styles/base.css</code> times every view-transition group with <code>motion.view</code> and{' '}
              <code>ease.standard</code>. Nothing names its own transition yet; the whole page cross-fades.
            </>,
            <>Only a move to another path cross-fades. A tab, a page of results or a filter changes the query string and swaps at once.</>,
            <>Focus, the URL and announcements behave the same with or without it; it only changes what the swap looks like.</>,
          ]}
        />
      </DocSection>
      <DocSection title="What moves, and what never does">
        <Rules
          items={[
            <>Hover and press feedback, colour changes: <code>motion.fast</code>. Menus and popovers opening: <code>motion.base</code>. Dialogs, drawers and toasts entering: <code>motion.slow</code>. A whole view changing (a route, a list’s display): <code>motion.view</code>.</>,
            <>
              Animate <code>opacity</code>, <code>transform</code> and colours. Never animate layout (width, height, top, margins): it jitters the
              page and costs a layout on every frame.
            </>,
            <>Never animate the focus ring, text people are reading, or a value changing in a table or a Stat: show the new value at once.</>,
            <>No parallax, no scroll-jacking, nothing that plays on its own for more than five seconds without a way to pause it.</>,
            <>Never make motion the only signal. The end state must make sense on its own, and async changes are announced with a live region (a Toast, a status).</>,
          ]}
        />
      </DocSection>
      <DocSection title="Reduced motion">
        <Rules
          items={[
            <>
              The token build writes a <code>prefers-reduced-motion: reduce</code> block into tokens.css, so every transition built from tokens
              collapses to zero without a media query in the component.
            </>,
            <>The skeleton pulse stops; the spinner keeps turning, because it is the only sign that work is in progress.</>,
            <>State still changes instantly: only the movement goes.</>,
            <>
              The visual suite runs with reduced motion, animations disabled and view transitions off (<code>html[data-view-transitions="off"]</code>,
              set by the harness), so screenshots never catch a frame mid-transition. <code>tests/visual/motion.spec.ts</code> turns motion back
              on and checks what moves, for how long, and that each switch stops it.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Motion', tags: ['!autodocs'], parameters: { layout: 'fullscreen', summary: 'Durations, easings, what moves, reduced motion' } } satisfies Meta;
export default meta;
export const MotionGuide: StoryObj = { name: 'Motion', render: () => <Motion /> };
