import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './SearchField';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  args: { label: 'Search records', placeholder: 'Search by name or owner', value: '', onValueChange: () => undefined },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <SearchField {...args} value={value} onValueChange={setValue} />;
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithQuery: Story = { args: { value: 'lease' } };
export const HiddenLabel: Story = { args: { hideLabel: true, value: 'lease' } };
export const WithDescription: Story = { args: { description: 'Matches names and owners.' } };
