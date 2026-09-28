import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Toolbar, ToolbarButton } from '../Toolbar/Toolbar';
import { ArchiveIcon, DownloadIcon, PlusIcon } from './icons';

/**
 * Icons have no component of their own to use: a system component takes one as a value
 * (`icon={ArchiveIcon}`). The whole set is on Foundations/Icons.
 */
const meta = {
  title: 'Components/Icons',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Icons in their places: beside a button's label, and on a toolbar button that names itself in a tooltip. */
export const InContext: Story = {
  render: () => (
    <Cluster gap="md" align="center">
      <Button icon={PlusIcon}>New record</Button>
      <Toolbar label="Conversation actions">
        <ToolbarButton icon={ArchiveIcon} shortcut="e">
          Archive
        </ToolbarButton>
        <ToolbarButton icon={DownloadIcon} hideLabel>
          Export
        </ToolbarButton>
      </Toolbar>
    </Cluster>
  ),
};
