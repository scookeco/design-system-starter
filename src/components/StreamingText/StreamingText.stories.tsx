import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreamingText } from './StreamingText';

const ANSWER = `**Master cleaning agreement** renews on 15 January 2027 [1].

- Owner: Sam Rivera
- Amount: $48,000 a year
- Either side can cancel with sixty days’ notice [2].

To export it, run:

\`\`\`bash
records export r-1001 --format csv
\`\`\`

See [the renewal policy](https://docs.example.com/renewals) for details.`;

const meta = {
  title: 'Components/StreamingText',
  component: StreamingText,
  args: { text: ANSWER, status: 'complete' },
} satisfies Meta<typeof StreamingText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the first token: a thinking indicator, and "Generating…" for screen readers. */
export const Pending: Story = { args: { text: '', status: 'pending' } };
/** Mid-stream, pinned: the parent has appended this much. The caret marks the end. */
export const Streaming: Story = { args: { text: ANSWER.slice(0, 150), status: 'streaming' } };
/** A fence still open mid-stream renders as a code block so far. */
export const StreamingCode: Story = { args: { text: ANSWER.slice(0, ANSWER.indexOf('csv') + 3), status: 'streaming' } };
export const Complete: Story = {};
export const Stopped: Story = { args: { text: ANSWER.slice(0, 120), status: 'stopped' } };
/** Citations become links through the citation renderer; without one they stay as text. */
export const WithCitations: Story = {
  args: { citation: (n: number) => <sup>{`(source ${String(n)})`}</sup> },
};
/**
 * Model output is untrusted. Raw HTML stays text, a javascript: link isn't a link, and an image
 * isn't loaded.
 */
export const UnsafeInput: Story = {
  args: {
    text: 'Here you go: <script>alert(1)</script> <img src=x onerror="alert(1)"> [click me](javascript:alert(1)) ![pixel](https://tracker.example/p.gif?d=secret)',
  },
};
