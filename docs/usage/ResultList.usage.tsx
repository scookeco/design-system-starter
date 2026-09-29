import { Badge, Cluster, EmptyState, Link, ResultList, ResultListItem, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ResultList, ResultListItem],
  whenToUse: [
    'A page of results people work through one at a time, each opening a page of its own: search results, “records like this”, a picker page of matches.',
    'Where the list is long enough that Tab through every item is a chore: one tab stop for the list, ↑ ↓ inside it, and the next Tab goes on to the pagination.',
  ],
  whenNotToUse: [
    { situation: 'The app’s or a section’s navigation (a few fixed destinations, one current)', instead: '`Nav` or `NavTabs`' },
    { situation: 'Actions on something, in a popup', instead: '`Menu` (it runs commands; this opens pages)' },
    { situation: 'Rows with several controls or columns to compare (a checkbox, a menu, amounts)', instead: '`Table`' },
    { situation: 'Jumping anywhere by typing, from any page', instead: '`CommandPalette` (its “See all results” row opens the results page)' },
    { situation: 'Picking a value for a form field', instead: '`Combobox` or `Select`' },
  ],
  do: {
    caption: 'One link per item with the matched text in <strong>, a status Badge beside it and the type on a second line; an EmptyState for no results.',
    render: () => (
      <ResultList label="Results" empty={<EmptyState reason="no-results" title="No results" />}>
        <ResultListItem href="#r-1042" meta={<Badge tone="success">Active</Badge>} description="Record · Dana Whitfield · Northwind Traders">
          <strong>North</strong>wind renewal
        </ResultListItem>
        <ResultListItem href="#a-12" description="Account · northwind.example">
          <strong>North</strong>wind Traders
        </ResultListItem>
      </ResultList>
    ),
  },
  dont: {
    caption: 'A hand-built list of links: every result is its own tab stop, the arrow keys do nothing, and each page re-invents the spacing.',
    render: () => (
      <Stack as="ol" role="list" gap="md" aria-label="Results">
        <li>
          <Cluster gap="xs">
            <Link href="#r-1042">Northwind renewal</Link>
            <Badge tone="success">Active</Badge>
          </Cluster>
          <Text size="caption" tone="muted">
            Record · Dana Whitfield
          </Text>
        </li>
      </Stack>
    ),
  },
  accessibility: [
    'A native ordered list of links (`ol` › `li` › `a`) with a roving tabindex: exactly one item is tabbable, the one last focused, so Tab away and back returns to it; a new page or query hands the stop to the first item.',
    'Not `role="listbox"`: listbox options are chosen, not followed, may not contain links, and switch screen readers into forms mode. Not `role="grid"` (the ARIA APG layout grid): one column gains nothing from grid navigation, and a plain list keeps browse-mode reading.',
    '↑ ↓ move, Home and End jump, Enter opens the link (the browser’s own activation). No wrap at the ends, no typeahead: every character reaches the page, so j and k and the other single-key shortcuts keep working, and nothing fires while typing in a field.',
    'Arrow keys inside a plain list aren’t announced as available: say so on the page (“↑ ↓ or J K move between results”), as the search page does.',
    'Paged results pass `total` and `start`: each item carries `aria-posinset` and `aria-setsize`, so screen readers that read them give its place in the whole set (“41 of 240”), not just on this page.',
    'Each link is at least the minimum target height and shows the system focus ring. Keep `meta` to static content (a Badge): a second control in an item is a Table row.',
  ],
};
