import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { Combobox } from './Combobox';

const PEOPLE = [
  { value: 'p01', label: 'Sam Rivera', description: 'sam.rivera@example.com' },
  { value: 'p02', label: 'Priya Natarajan', description: 'priya.natarajan@example.com' },
  { value: 'p03', label: 'Jo Okafor', description: 'jo.okafor@example.com' },
  { value: 'p04', label: 'Mei Chen', description: 'mei.chen@example.com' },
  { value: 'p05', label: 'Lucas Moreau', description: 'lucas.moreau@example.com' },
  { value: 'p06', label: 'Amara Diallo', description: 'amara.diallo@example.com', disabled: true },
];

const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  args: { label: 'Owner', options: PEOPLE, placeholder: 'Type a name' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: 'p02' } };
export const WithDescription: Story = { args: { description: 'Who answers questions about this record.' } };
export const WithError: Story = { args: { error: 'Choose an owner.', required: true } };
export const Disabled: Story = { args: { defaultValue: 'p02', disabled: true } };
export const Small: Story = { args: { size: 'sm', defaultValue: 'p03' } };
export const Large: Story = { args: { size: 'lg', defaultValue: 'p03' } };
/** The list open: every option, a second line each, the chosen one checked, a disabled one. */
export const Open: Story = { args: { defaultValue: 'p02', defaultOpen: true } };
/** Inside a Dialog: the list portals into the dialog, so its focus trap and outside clicks include it; Esc closes the list, not the dialog. */
export const InDialog: Story = {
  tags: ['modal-open', '!autodocs'],
  render: (args) => (
    <Dialog title="Reassign record" defaultOpen footer={<Button>Reassign</Button>}>
      <Combobox {...args} defaultOpen />
    </Dialog>
  ),
};
