import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsPage } from './SettingsPage';

const meta = {
  title: 'Examples/Settings page',
  component: SettingsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PersonalNotifications: Story = {};
export const PersonalProfile: Story = { args: { initialSection: 'profile' } };
export const WorkspaceGeneral: Story = { args: { initialSection: 'general' } };
export const Saving: Story = { args: { initialSaving: true } };
export const Saved: Story = { args: { initialSaved: true } };
