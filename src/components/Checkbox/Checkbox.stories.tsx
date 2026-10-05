import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from '../../primitives/Grid/Grid';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: 'Include drafts' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Indeterminate: Story = { args: { checked: 'indeterminate', label: 'Select all' } };
export const WithDescription: Story = { args: { description: 'Drafts are only visible to their owner.' } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };
/** In a table row: the name ("Select Hardware lease") is for assistive tech; the row shows what it is. */
export const HiddenLabel: Story = { args: { label: 'Select Hardware lease', hideLabel: true, defaultChecked: true } };

/** Tiles: a set of choices where the whole box is the target. Checked fills; unchecked is dashed. */
export const Tiles: Story = {
  render: () => (
    <Grid as="ul" role="list" min="sm" gap="sm">
      <li><Checkbox variant="tile" label="Master agreement" name="type" value="msa" defaultChecked /></li>
      <li><Checkbox variant="tile" label="Statement of work" name="type" value="sow" defaultChecked /></li>
      <li><Checkbox variant="tile" label="Order form" name="type" value="order" /></li>
    </Grid>
  ),
};

/** Categorised tiles: each tile's kind in a category colour (color.category.*), never a status colour. */
export const TileCategories: Story = {
  render: () => (
    <Grid as="ul" role="list" min="sm" gap="sm">
      {([1, 2, 3, 4, 5, 6] as const).map((category) => (
        <li key={category}>
          <Checkbox variant="tile" category={category} label={`Category ${String(category)}`} defaultChecked={category % 2 === 1} />
        </li>
      ))}
    </Grid>
  ),
};
