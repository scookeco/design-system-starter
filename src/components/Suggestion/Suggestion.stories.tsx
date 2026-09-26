import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Suggestion, type SuggestionProps } from './Suggestion';

const SUGGESTED = ' cleaning and security for both offices. Renews each January unless either side gives sixty days’ notice.';

/** Holds the value and the suggestion, as a form would. */
function Controlled(props: Partial<SuggestionProps>) {
  const [value, setValue] = useState(props.value ?? 'Covers facilities maintenance,');
  const [suggestion, setSuggestion] = useState(props.suggestion);
  return (
    <Suggestion
      label="Description"
      description="Shown to everyone with access to the record."
      {...props}
      value={value}
      onValueChange={setValue}
      suggestion={suggestion}
      onAccept={() => {
        setValue(value + (suggestion ?? ''));
        setSuggestion(undefined);
      }}
      onDismiss={() => setSuggestion(undefined)}
    />
  );
}

const meta = {
  title: 'Components/Suggestion',
  component: Suggestion,
  args: { label: 'Description', value: '', onValueChange: () => undefined, onAccept: () => undefined, onDismiss: () => undefined },
} satisfies Meta<typeof Suggestion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ghost text after what was typed: Tab accepts, Esc dismisses, typing over it ignores it. */
export const Ready: Story = { render: () => <Controlled suggestion={SUGGESTED} /> };
/** Still arriving: shown, but Accept waits for it to finish. */
export const Pending: Story = { render: () => <Controlled suggestion={SUGGESTED.slice(0, 40)} pending /> };
export const NoSuggestion: Story = { render: () => <Controlled /> };
export const EmptyField: Story = { render: () => <Controlled value="" suggestion={SUGGESTED.trim()} /> };
export const WithError: Story = { render: () => <Controlled error="Keep the description under 500 characters." /> };
export const Disabled: Story = { render: () => <Controlled disabled /> };
