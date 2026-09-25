import { Card, CardBody, CardHeader, Sidebar, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Sidebar],
  whenToUse: [
    'A narrow region beside a wider one inside a card, panel or dialog, stacking when space runs out.',
    '`placement` sets the edge; DOM order follows, so reading order matches.',
  ],
  whenNotToUse: [
    { situation: 'The app’s navigation', instead: 'AppShell, which owns it and collapses it to a drawer' },
    { situation: 'A page’s properties rail or section sub-nav', instead: '`PageLayout`, which names the aside and places the nav' },
    { situation: 'Equal columns', instead: '`Grid`' },
  ],
  do: {
    caption: 'Main content first, a narrow region at the end that stacks below it when space runs out.',
    render: () => (
      <Sidebar
        placement="end"
        sideWidth="sm"
        gap="md"
        side={
          <Card>
            <CardHeader title="Properties" level={4} />
          </Card>
        }
      >
        <Card>
          <CardBody>
            <Text>Activity, newest first.</Text>
          </CardBody>
        </Card>
      </Sidebar>
    ),
  },
  dont: {
    caption: 'The important content squeezed into the narrow side.',
    render: () => (
      <Sidebar
        sideWidth="sm"
        side={
          <Card>
            <CardBody>
              <Text>Activity, newest first, with every change to the record.</Text>
            </CardBody>
          </Card>
        }
      >
        <Card>
          <CardHeader title="Owner" level={4} />
        </Card>
      </Sidebar>
    ),
  },
  accessibility: [
    'Layout only: it adds no landmark. For a page’s nav or aside regions use `PageLayout`, which does.',
    'Stacks in DOM order on narrow containers, so nothing is lost at 400% zoom.',
  ],
};
