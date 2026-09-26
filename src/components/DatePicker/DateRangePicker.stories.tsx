import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateRangePicker } from './DatePicker';

const meta = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  args: { label: 'Date range' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: { start: '2026-09-01', end: '2026-09-25' } } };
export const WithError: Story = { args: { defaultValue: { start: '2026-09-01', end: '2026-09-25' }, error: 'Choose at most 90 days.' } };
export const Disabled: Story = { args: { defaultValue: { start: '2026-09-01', end: '2026-09-25' }, disabled: true } };
/** One calendar: the ends filled, the days between tinted. */
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultValue: { start: '2026-09-08', end: '2026-09-18' }, defaultOpen: true } };
