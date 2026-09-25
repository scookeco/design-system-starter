import { Badge, Button, Heading, PageHeader, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [PageHeader],
  whenToUse: [
    'The top of every page, inside AppShell’s main or a FocusedLayout: the page title (the one h1), an optional status, one line of description and the page’s actions.',
    'Actions go in `actions`: secondary first, the one primary action last, then a “More” `Menu` for the rest, destructive items last in it.',
    'A record’s status goes in `status` as a `Badge`, mapped from the domain status in one place.',
  ],
  whenNotToUse: [
    { situation: 'Breadcrumbs', instead: 'AppShell’s `breadcrumbs` slot; the header of the frame owns the trail' },
    { situation: 'A section title inside the page', instead: '`CardHeader` or a `Heading` at level 2' },
    { situation: 'Global actions (search, a global create)', instead: 'AppShell’s `actions` slot' },
  ],
  do: {
    caption: 'Title, status and metadata on the start side; page actions on the end, primary last.',
    render: () => (
      <PageHeader
        title="Hardware lease"
        status={<Badge tone="info">Pending</Badge>}
        description="Owned by Facilities · updated 2026-09-10"
        actions={
          <>
            <Button variant="secondary">Share</Button>
            <Button>Request approval</Button>
          </>
        }
      />
    ),
  },
  dont: {
    caption: 'A hand-built title row: the gaps, alignment and wrapping drift from page to page, and the status sits under the title.',
    render: () => (
      <Stack gap="xs">
        <Heading level={1} size={3}>
          Hardware lease
        </Heading>
        <Badge tone="info">Pending</Badge>
        <Text tone="muted">Owned by Facilities</Text>
        <Button>Request approval</Button>
      </Stack>
    ),
  },
  accessibility: [
    'Renders the page’s h1, so every page has exactly one, in the same place. Keep it the same words as the nav item or breadcrumb that leads here.',
    'The status is a `Badge`: icon and text as well as colour.',
    'Pass `headingRef` to move focus to the title after a client-side step or route change; the heading then takes `tabIndex={-1}`.',
  ],
};
