import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { IntegrationsPage } from './IntegrationsPage';

const meta = {
  title: 'Examples/Integrations',
  component: IntegrationsPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof IntegrationsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Connected apps first, then the catalogue: one action per card. */
export const Default: Story = { parameters: mockApi({ url: '/integrations' }) };
/** A workspace with nothing connected yet. */
export const NothingConnected: Story = { parameters: mockApi({ url: '/integrations', tenant: 'globex' }) };
/** An editor sees the catalogue; Connect is disabled, pointing at the reason under the header. */
export const AsEditor: Story = { parameters: mockApi({ url: '/integrations', role: 'editor' }) };
/** An app's settings in a Drawer, opened from the URL (?app=relay). */
export const SettingsOpen: Story = { tags: ['modal-open'], parameters: mockApi({ url: '/integrations?app=relay' }) };
/** Saving: the button shows it's pending, and nothing changes until the server answers. */
export const SettingsSaving: Story = {
  tags: ['modal-open', 'busy'],
  args: { initialSave: { frequency: 'daily', direction: 'two-way' } },
  parameters: { ...mockApi({ url: '/integrations?app=relay' }), ...mswOverrides(hold('patch', '/integrations/relay')) },
};
/** Someone else changed the settings first (409): nothing was saved, the choices stay, and Reload shows theirs. */
export const SettingsConflict: Story = {
  tags: ['modal-open'],
  args: { initialSave: { frequency: 'daily', direction: 'two-way' } },
  parameters: { ...mockApi({ url: '/integrations?app=relay' }), ...mswOverrides(fail('patch', '/integrations/relay', 409, 'conflict', 'Someone else changed these settings since you opened them.')) },
};
/** Disconnecting deletes the settings, so it's confirmed, naming the app. */
export const ConfirmDisconnect: Story = { tags: ['modal-open'], args: { initialConfirmDisconnect: true }, parameters: mockApi({ url: '/integrations?app=relay' }) };
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/integrations' }), ...mswOverrides(hold('get', '/integrations')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/integrations' }), ...mswOverrides(fail('get', '/integrations')) } };
