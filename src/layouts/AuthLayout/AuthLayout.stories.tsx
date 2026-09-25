import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Button } from '../../components/Button/Button';
import { Heading } from '../../components/Heading/Heading';
import { Link } from '../../components/Link/Link';
import { Text } from '../../components/Text/Text';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Stack } from '../../primitives/Stack/Stack';
import { AuthLayout } from './AuthLayout';

const card = (
  <>
    <Stack gap="2xs">
      <Heading level={1} size={2}>
        Sign in to Acme
      </Heading>
      <Text tone="muted">Use your work account.</Text>
    </Stack>
    <Button>Continue with SSO</Button>
  </>
);

const footer = (
  <Cluster gap="md" justify="center">
    <Link href="/privacy">Privacy</Link>
    <Link href="/terms">Terms</Link>
  </Cluster>
);

const meta = {
  title: 'Layouts/AuthLayout',
  component: AuthLayout,
  args: { brand: 'Acme', children: card },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AuthLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithFooter: Story = { args: { footer } };
export const Narrow: Story = {
  args: { footer },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
