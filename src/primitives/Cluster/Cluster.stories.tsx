import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Cluster } from './Cluster';

const items = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];

const meta = {
  title: 'Primitives/Cluster',
  component: Cluster,
  args: { gap: 'sm', children: items.map((item) => <DemoBox key={item}>{item}</DemoBox>) },
} satisfies Meta<typeof Cluster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const JustifyBetween: Story = {
  args: { justify: 'between', children: [<DemoBox key="t">Title</DemoBox>, <DemoBox key="a">Actions</DemoBox>] },
};
export const JustifyEnd: Story = { args: { justify: 'end', children: items.slice(0, 3).map((i) => <DemoBox key={i}>{i}</DemoBox>) } };
export const GapLarge: Story = { args: { gap: 'lg' } };
