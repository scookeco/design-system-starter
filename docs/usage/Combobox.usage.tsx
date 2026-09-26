import { Combobox, Select } from '../../src/index';
import type { UsageDoc } from './types';

const PEOPLE = [
  { value: 'p01', label: 'Sam Rivera', description: 'sam.rivera@example.com' },
  { value: 'p02', label: 'Priya Natarajan', description: 'priya.natarajan@example.com' },
  { value: 'p03', label: 'Jo Okafor', description: 'jo.okafor@example.com' },
];

export const usage: UsageDoc = {
  covers: [Combobox],
  whenToUse: ['Choosing one value from a list too long to scan (people, accounts, countries): type to narrow it.', 'A filter that picks one actor or one owner.'],
  whenNotToUse: [
    { situation: 'A short, fixed list (about 5–15 options)', instead: '`Select`' },
    { situation: 'Several values', instead: '`MultiSelect`' },
    { situation: 'Free text with suggestions, or jumping around the app', instead: '`SearchField`, or the `CommandPalette`' },
  ],
  do: {
    caption: 'A long list with a second line that tells similar names apart.',
    render: () => <Combobox label="Owner" options={PEOPLE} defaultValue="p02" />,
  },
  dont: {
    caption: 'Three options behind typing: a Select (or radios) shows them at once.',
    render: () => (
      <Select
        label="Plan"
        options={[
          { value: 'free', label: 'Free' },
          { value: 'team', label: 'Team' },
          { value: 'enterprise', label: 'Enterprise' },
        ]}
      />
    ),
  },
  accessibility: [
    'React Aria’s combobox pattern: the input keeps focus, ↑ ↓ move through the list (announced), ↵ chooses, Esc closes; the button opens the list for pointer users.',
    'Label, description and error are wired by React Aria’s slots and laid out like every other field.',
    'Inside a Dialog the list portals into the dialog and Esc closes only the list.',
    'Typing matches with a locale-aware “contains”, so accents and case don’t get in the way.',
  ],
};
