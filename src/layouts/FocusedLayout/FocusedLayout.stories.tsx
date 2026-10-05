import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoNarrow } from '../../../.storybook/DemoBox';
import { Button } from '../../components/Button/Button';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { Progress } from '../../components/Progress/Progress';
import { Stepper } from '../../components/Stepper/Stepper';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Grid } from '../../primitives/Grid/Grid';
import { FocusedLayout } from './FocusedLayout';
import { CloseIcon } from '../../components/Icon/icons';

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
      <Button variant="ghost" icon={CloseIcon}>
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
/** A step laid out across the width: a grid of choices. Every step of the task takes the same width. */
export const Wide: Story = {
  args: {
    footer,
    width: 'lg',
    children: (
      <>
        <Stepper label="Setup steps" steps={steps} current={1} />
        <PageHeader title="Choose your plan" description="Every plan includes unlimited workspaces." />
        <Grid min="sm">
          <DemoBox>Starter</DemoBox>
          <DemoBox>Team</DemoBox>
          <DemoBox>Business</DemoBox>
          <DemoBox>Enterprise</DemoBox>
        </Grid>
      </>
    ),
  },
};
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
