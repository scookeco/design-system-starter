import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette, type CommandGroup } from './CommandPalette';

const noop = () => undefined;

const GROUPS: CommandGroup[] = [
  {
    id: 'pages',
    label: 'Jump to',
    items: [
      { id: 'home', label: 'Home', description: 'Page', icon: 'home', shortcut: 'g h', onSelect: noop },
      { id: 'records', label: 'Records', description: 'Page', icon: 'file', shortcut: 'g r', onSelect: noop },
      { id: 'accounts', label: 'Accounts', description: 'Page', icon: 'building', shortcut: 'g a', onSelect: noop },
      { id: 'settings', label: 'Settings', description: 'Page', icon: 'settings', onSelect: noop },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { id: 'a1', label: 'Northwind Traders', description: 'Account · northwind.example', icon: 'building', onSelect: noop },
      { id: 'a2', label: 'Blue Harbor Logistics', description: 'Account · blueharbor.example', icon: 'building', onSelect: noop },
      { id: 'a3', label: 'Contoso Health', description: 'Account · contoso-health.example', icon: 'building', onSelect: noop },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    items: [
      { id: 'new', label: 'New record', keywords: ['create', 'add'], icon: 'plus', onSelect: noop },
      { id: 'keys', label: 'Keyboard shortcuts', keywords: ['help'], shortcut: '?', onSelect: noop },
    ],
  },
];

const meta = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  tags: ['modal-open', '!autodocs'],
  args: { groups: GROUPS, defaultOpen: true, platform: 'mac' },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty query: every group, so the palette is useful before anything is typed. */
export const Open: Story = {};
/** Ranked forgivingly: prefix, then word start, then contains, then letters in order ("nwt"). */
export const Filtered: Story = { args: { query: 'no' } };
/** Keywords find actions by the word people type ("create" finds New record). */
export const MatchedByKeyword: Story = { args: { query: 'create' } };
export const NoResults: Story = { args: { query: 'zzz' } };
/** A server group still searching: a spinner in the input, "Searching…" in the count. */
export const Searching: Story = {
  args: { query: 'lease', loading: true, groups: [{ id: 'records', label: 'Records', items: [], filter: 'none' }] },
};
