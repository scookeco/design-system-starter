import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocaleProvider } from '../../format';
import { NumberField } from './NumberField';

const meta = {
  title: 'Components/NumberField',
  component: NumberField,
  args: { label: 'Seats' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: 1284, min: 0 } };
/** Money: the value is integer minor units (125050 → $1,250.50), like every amount in the system. */
export const Currency: Story = { args: { label: 'Amount', currency: 'USD', defaultValue: 125050, min: 0 } };
export const Percent: Story = { args: { label: 'Discount', format: 'percent', defaultValue: 0.125, min: 0, max: 1, step: 0.01, maximumFractionDigits: 1 } };
/** The same money typed the German way ("1.250,50 €"): parsing follows LocaleProvider too. */
export const GermanCurrency: Story = {
  args: { label: 'Betrag', currency: 'EUR', defaultValue: 125050 },
  render: (args) => (
    <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
      <NumberField {...args} />
    </LocaleProvider>
  ),
};
export const WithError: Story = { args: { defaultValue: 0, min: 1, error: 'A plan needs at least 1 seat.' } };
export const Disabled: Story = { args: { defaultValue: 12, disabled: true } };
export const WithoutStepper: Story = { args: { defaultValue: 12, hideStepper: true } };
