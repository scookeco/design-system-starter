import { Card, CardBody, CardHeader, Sidebar, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Sidebar],
  whenToUse: [
    'A narrow region beside the main one that stacks when space runs out: a record’s properties rail, a settings sub-nav.',
    '`placement` sets the edge; DOM order follows, so reading order matches.',
  ],
  whenNotToUse: [
    { situation: 'The app’s navigation', instead: 'AppShell, which owns it and collapses it to a drawer' },
    { situation: 'Equal columns', instead: '`Grid`' },
  ],
  do: {
    caption: 'Main content first, properties in the rail at the end.',
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
    'Layout only. When the side region is navigation or complementary content, pass it as a `Nav` or give it `as="aside"`.',
    'Stacks in DOM order on narrow containers, so nothing is lost at 400% zoom.',
  ],
};
