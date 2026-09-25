import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoNarrow } from '../../../.storybook/DemoBox';
import { Button } from '../../components/Button/Button';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { Progress } from '../../components/Progress/Progress';
import { Stepper } from '../../components/Stepper/Stepper';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { FocusedLayout } from './FocusedLayout';

const steps = [{ label: 'Workspace' }, { label: 'Invite' }, { label: 'Plan' }, { label: 'Review' }];

const footer = (
  <Cluster justify="between">
    <Button variant="secondary">Back</Button>
    <Button>Next</Button>
  </Cluster>
);

const meta = {
  title: 'Layouts/FocusedLayout',
  component: FocusedLayout,
  args: {
    brand: 'Acme',
    task: 'Set up your workspace',
    exit: (
      <Button variant="ghost" icon="close">
        Exit setup
      </Button>
    ),
    children: (
      <>
        <Stepper label="Setup steps" steps={steps} current={1} />
        <PageHeader title="Invite your team" description="They get an email with a link to join." />
        <DemoBox>The step’s form</DemoBox>
      </>
    ),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FocusedLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithActionBar: Story = { args: { footer } };
export const WithProgress: Story = { args: { footer, progress: <Progress label="Setup progress" value={2} max={4} valueText="Step 2 of 4" /> } };
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
