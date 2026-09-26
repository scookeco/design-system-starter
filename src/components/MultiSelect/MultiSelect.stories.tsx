import type { Meta, StoryObj } from '@storybook/react-vite';
import { MultiSelect } from './MultiSelect';

const EVENTS = [
  { value: 'member.invited', label: 'Member invited' },
  { value: 'member.role_changed', label: 'Role changed' },
  { value: 'member.removed', label: 'Member removed' },
  { value: 'record.archived', label: 'Record archived' },
  { value: 'record.deleted', label: 'Record deleted' },
  { value: 'session.signed_in', label: 'Signed in' },
];

const meta = {
  title: 'Components/MultiSelect',
  component: MultiSelect,
  args: { label: 'Events', options: EVENTS, placeholder: 'Any event' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
/** Chosen values as removable chips, in the order they were chosen. */
export const WithValues: Story = { args: { defaultValue: ['member.role_changed', 'member.removed'] } };
/** Many values wrap onto another line; the field grows. */
export const Wrapping: Story = { args: { defaultValue: EVENTS.map((e) => e.value) } };
export const WithError: Story = { args: { error: 'Choose at least one event.', required: true } };
export const Disabled: Story = { args: { defaultValue: ['record.archived'], disabled: true } };
/** Open: React Aria hides everything but the input and the list from assistive technology while the list is open, chips included, so axe's aria-hidden-focus is relaxed here (modal-open). */
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultValue: ['member.role_changed'], defaultOpen: true } };
