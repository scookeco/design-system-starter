import { Button, Card, CardBody, CardFooter, CardHeader, Stack, Switch } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Card, CardHeader, CardBody, CardFooter],
  whenToUse: [
    'One titled block of a page: a record section, a settings category with its own Save.',
    'Parts in order: `CardHeader` (title, description, small actions), `CardBody`, `CardFooter`.',
  ],
  whenNotToUse: [
    { situation: 'Wrapping a whole page or a table', instead: 'the page itself; a Table is already a surface' },
    { situation: 'Grouping without a title', instead: 'a `Stack`: a card without a title is just a box' },
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
  ],
};
