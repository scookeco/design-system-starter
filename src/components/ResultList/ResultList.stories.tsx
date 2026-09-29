import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge/Badge';
import { EmptyState } from '../EmptyState/EmptyState';
import { ResultList, ResultListItem } from './ResultList';

const RESULTS = [
  { id: 'r-1042', title: <><strong>North</strong>wind renewal</>, detail: 'Record · Dana Whitfield · Northwind Traders', status: <Badge tone="success">Active</Badge> },
  { id: 'a-12', title: <><strong>North</strong>wind Traders</>, detail: 'Account · northwind.example' },
  { id: 'p-7', title: <>Priya <strong>North</strong>cott</>, detail: 'Person · priya@northwind.example' },
  { id: 'r-1077', title: <><strong>North</strong>wind pilot extension</>, detail: 'Record · Sam Ortiz · Northwind Traders', status: <Badge tone="warning">In review</Badge> },
  { id: 'r-1103', title: <><strong>North</strong>ern region licences</>, detail: 'Record · Dana Whitfield · Contoso', status: <Badge tone="neutral">Draft</Badge> },
];

const items = RESULTS.map((r) => (
  <ResultListItem key={r.id} id={`result-${r.id}`} href={`#${r.id}`} description={r.detail} {...(r.status ? { meta: r.status } : {})}>
    {r.title}
  </ResultListItem>
));

const meta = {
  title: 'Components/ResultList',
  component: ResultList,
  args: {
    label: 'Results',
    children: items,
    empty: <EmptyState reason="no-results" title="No results for “northwind”" description="Check the spelling, or search for part of a name." />,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ResultList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tab stop: Tab lands on the first result (or the one you left), ↑ ↓ move, Home and End jump, Enter opens. */
export const Default: Story = {};

/** The third result holds focus and the tab stop: the system focus ring, around the link at its full target height. */
export const FocusedItem: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>('#result-p-7')?.focus();
  },
};

/** Page 3 of 240 results: each item says where it sits in the whole set (aria-posinset, aria-setsize), not just on this page. */
export const OnePageOfMany: Story = { args: { start: 41, total: 240 } };

/** No items: the list renders its `empty` content instead of an empty, labelled list. */
export const Empty: Story = { args: { children: [] } };

/** Long names and second lines wrap inside the column; the badge wraps below rather than squeezing the name. */
export const LongLabels: Story = {
  args: {
    children: [
      <ResultListItem key="long-1" href="#long-1" meta={<Badge tone="success">Active</Badge>} description="Record · Dana Whitfield · Northwind Traders International Holdings (Europe, Middle East and Africa)">
        <strong>Northwind</strong> Traders International Holdings: multi-year enterprise renewal with expanded seats, premium support and a data residency addendum
      </ResultListItem>,
      <ResultListItem key="long-2" href="#long-2" description="Person · priya.northcott-hargreaves@northwind-traders-international.example">
        Priya <strong>North</strong>cott-Hargreaves
      </ResultListItem>,
      <ResultListItem key="long-3" href="#long-3" description="Account · a-very-long-subdomain.northwind-traders-international-holdings.example">
        <strong>Northwind</strong>TradersInternationalHoldingsWithoutSpaces
      </ResultListItem>,
    ],
  },
};

/** Compact: less space between items, for long lists people scan. Every link keeps its minimum target height. */
export const Compact: Story = { args: { density: 'compact' } };
