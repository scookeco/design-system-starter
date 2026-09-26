import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineEdit } from './InlineEdit';

const required = (value: string) => (value.trim() ? undefined : 'Enter a name.');

const meta = {
  title: 'Components/InlineEdit',
  component: InlineEdit,
  args: { label: 'Name', value: 'Northwind renewal', onSave: () => undefined, validate: required },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof InlineEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The value, as a button: click (or Enter) to edit. */
export const Viewing: Story = {};
export const EmptyValue: Story = { args: { value: '', placeholder: 'Add a name' } };
/** Enter saves, Escape cancels; focus returns to the value either way. */
export const Editing: Story = { args: { defaultEditing: true } };
/** Validation keeps the draft and says what to fix. */
export const Invalid: Story = { args: { defaultDraft: '' } };
/** Read-only for this person, with the reason. */
export const Disabled: Story = { args: { disabledReason: 'Only editors can rename records.' } };
