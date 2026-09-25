import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Nav } from '../Nav/Nav';
import { Text } from '../Text/Text';
import { Drawer } from './Drawer';

const filters = (
  <>
    <Checkbox label="Active" defaultChecked />
    <Checkbox label="Pending" defaultChecked />
    <Checkbox label="Overdue" />
    <Checkbox label="Draft" />
  </>
);

const footer = (
  <>
    <Button variant="secondary">Clear</Button>
    <Button>Show 12 records</Button>
  </>
);

const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  args: {
    title: 'Filters',
    description: 'Narrow the list. Applies when you choose Show.',
    trigger: <Button variant="secondary">Filters</Button>,
    children: filters,
    footer,
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const EndOpen: Story = { tags: ['modal-open', '!autodocs'], args: { defaultOpen: true } };
export const StartOpen: Story = {
  tags: ['modal-open', '!autodocs'],
  args: {
    defaultOpen: true,
    side: 'start',
    size: 'sm',
    title: 'Menu',
    hideTitle: true,
    description: undefined,
    footer: undefined,
    trigger: <Button variant="ghost" icon="menu">Menu</Button>,
    children: (
      <Nav
        label="Main"
        current="/records"
        sections={[
          {
            items: [
              { label: 'Home', href: '/home', icon: 'home' },
              { label: 'Records', href: '/records', icon: 'file' },
            ],
          },
        ]}
      />
    ),
  },
};
export const WithoutFooter: Story = {
  tags: ['modal-open', '!autodocs'],
  args: { defaultOpen: true, footer: undefined, description: undefined, title: 'Hardware lease', children: <Text>Owned by Facilities · updated 2026-09-10</Text> },
};
