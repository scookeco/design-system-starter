import type { Meta, StoryObj } from '@storybook/react-vite';
import { createFormatter } from '../../format/format';
import { Stat } from './Stat';

/** Stat takes formatted strings; apps format with useFormat(). The gallery formats once, in US English. */
const f = createFormatter({ locale: 'en-US', timeZone: 'UTC' });

const meta = {
  title: 'Components/Stat',
  component: Stat,
  args: { label: 'Active records', value: f.number(1284) },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValueOnly: Story = {};
export const UpPositive: Story = { args: { delta: { value: f.percent(0.12), direction: 'up', tone: 'positive' }, comparison: 'vs previous 30 days' } };
export const UpNegative: Story = {
  args: { label: 'Overdue records', value: f.number(14), delta: { value: f.number(3), direction: 'up', tone: 'negative' }, comparison: 'vs previous 30 days' },
};
export const DownPositive: Story = {
  args: { label: 'Pending approvals', value: f.number(9), delta: { value: f.percent(0.25), direction: 'down', tone: 'positive' }, comparison: 'vs previous 30 days' },
};
export const DownNeutral: Story = { args: { label: 'Records created', value: f.number(86), delta: { value: f.percent(0.04), direction: 'down' }, comparison: 'vs previous 30 days' } };
export const Flat: Story = { args: { label: 'Contract value', value: f.money(120_000_000, 'USD', { compact: true }), delta: { value: f.percent(0), direction: 'flat' }, comparison: 'vs previous 30 days' } };
