import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from './CodeBlock';

const meta = {
  title: 'Components/CodeBlock',
  component: CodeBlock,
  args: { label: 'Install command', language: 'bash', code: 'npm install @acme/design-system' },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MultiLine: Story = {
  args: {
    label: 'Webhook handler',
    language: 'ts',
    code: `
export async function handle(request: Request) {
  const event = await request.json();
  if (event.type === 'invoice.paid') {
    await markPaid(event.data.invoiceId, { paidAt: event.created, source: 'webhook', retryPolicy: 'exponential-backoff-with-jitter' });
  }
  return new Response(null, { status: 204 });
}
`,
  },
};
export const NoLanguage: Story = { args: { language: undefined } };
export const NotCopyable: Story = { args: { copyable: false, language: undefined, label: 'Response', code: '{ "status": "ok" }' } };
