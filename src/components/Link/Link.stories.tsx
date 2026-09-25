import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../Text/Text';
import { Link, LinkProvider, type LinkComponentProps } from './Link';

/** Stands in for an app's router link: it only marks the anchor, so the story shows the wiring. */
const DemoRouterLink = ({ href, ...rest }: LinkComponentProps) => <a {...rest} href={href} data-router-link="true" />;

const meta = {
  title: 'Components/Link',
  component: Link,
  args: { href: '/records/r-1002', children: 'View Hardware lease' },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {};
export const InRunningText: Story = {
  render: (args) => (
    <Text>
      The lease renews in January. <Link {...args} /> for the full terms.
    </Text>
  ),
};
export const ThroughLinkProvider: Story = {
  render: (args) => (
    <LinkProvider component={DemoRouterLink}>
      <Link {...args} />
    </LinkProvider>
  ),
};
