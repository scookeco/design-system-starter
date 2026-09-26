import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocaleProvider } from '../../format';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { DatePicker } from './DatePicker';

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  args: { label: 'Renews on' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Segments in the reader's order and format, from LocaleProvider (the gallery's Locale toolbar). */
export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: '2026-10-14' } };
export const WithDescription: Story = { args: { defaultValue: '2026-10-14', description: 'We email the owner 30 days before.' } };
export const WithError: Story = { args: { defaultValue: '2026-08-01', min: '2026-09-25', error: 'Choose a date from today on.' } };
export const Disabled: Story = { args: { defaultValue: '2026-10-14', disabled: true } };
export const Small: Story = { args: { size: 'sm', defaultValue: '2026-10-14' } };
/** The calendar: today marked, the chosen day filled, days before `min` unavailable. */
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultValue: '2026-10-14', min: '2026-10-05', defaultOpen: true } };
/** German order and names ("14.10.2026", "Oktober 2026"): the same LocaleProvider useFormat() reads. */
export const German: Story = {
  tags: ['modal-open', '!autodocs'],
  args: { defaultValue: '2026-10-14', defaultOpen: true, label: 'Verlängert am' },
  render: (args) => (
    <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
      <DatePicker {...args} />
    </LocaleProvider>
  ),
};
/** Inside a Dialog: the calendar portals into it; Esc closes the calendar first. */
export const InDialog: Story = {
  tags: ['modal-open', '!autodocs'],
  render: (args) => (
    <Dialog title="Change renewal" defaultOpen footer={<Button>Save</Button>}>
      <DatePicker {...args} defaultValue="2026-10-14" defaultOpen />
    </Dialog>
  ),
};
