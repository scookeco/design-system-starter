import { Button, Card, CardBody, CardFooter, CardHeader, CardLink, Stack, Switch } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Card, CardHeader, CardBody, CardFooter, CardLink],
  whenToUse: [
    'One titled block of a page: a record section, a settings category with its own Save.',
    'Parts in order: `CardHeader` (title, description, small actions), `CardBody`, `CardFooter`.',
    '`CardLink` when the whole card is one choice in a grid of them (an industry, a template): one link, with its title, a line on what it does and a quiet meta line.',
    '`CardLink state="unavailable"` with a Badge for a choice that exists but can\u2019t be taken yet, so the set reads as complete.',
  ],
  whenNotToUse: [
    { situation: 'Wrapping a whole page or a table', instead: 'the page itself; a Table is already a surface' },
    { situation: 'Grouping without a title', instead: 'a `Stack`: a card without a title is just a box' },
    { situation: 'A card with its own buttons or links inside', instead: 'a `Card` with a Link in it: a `CardLink` is one link and can\u2019t contain another' },
    { situation: 'Restyling a Card into a clickable tile', instead: '`CardLink`' },
  ],
  do: {
    caption: 'A titled section that saves on its own.',
    render: () => (
      <Card>
        <CardHeader title="Notifications" level={4} description="How we contact you about your records." />
        <CardBody>
          <Switch label="Email me a weekly digest" defaultChecked />
        </CardBody>
        <CardFooter>
          <Button>Save</Button>
        </CardFooter>
      </Card>
    ),
  },
  dont: {
    caption: 'Cards nested in cards: the borders stack up and the hierarchy is lost.',
    render: () => (
      <Card>
        <CardHeader title="Profile" level={4} />
        <CardBody>
          <Stack>
            <Card>
              <CardHeader title="Name" level={4} />
            </Card>
          </Stack>
        </CardBody>
      </Card>
    ),
  },
  accessibility: [
    '`CardHeader` requires a `title`, rendered as a heading at `level` (default 2) so the card is a section in the outline.',
    'Keep the card’s actions inside it, next to what they affect.',
    '`CardLink`: the title is a heading inside the link, so the grid stays in the outline and the link’s name is its title and description. Hover and focus change the border and the title, not colour alone.',
    'An unavailable `CardLink` is not a link at all (nothing to focus), and its Badge says why in words.',
  ],
};
