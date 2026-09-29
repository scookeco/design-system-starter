/**
 * GOLDEN EXAMPLE: an integrations catalogue (customer-facing): the apps a workspace can connect,
 * connect and disconnect as pessimistic writes, and each app's settings in a Drawer. The archetype
 * for any catalogue of things a workspace turns on: apps, add-ons, templates. No CSS file, no
 * className, no style.
 *
 * Anatomy:
 *   shell    Settings is the current nav item; breadcrumb Settings / Integrations
 *   header   PageHeader; for anyone who can't change integrations, the reason, once, which every
 *            disabled button points at
 *   lists    Connected, then Available: a Grid of Cards (name, category, what it does, who
 *            connected it and when), a status Badge and one action per card
 *   drawer   ?app=relay opens the app's settings (push, so Back closes it): how often and which
 *            way it syncs, Save (versioned: a 409 says someone else changed them, with Reload), and
 *            Disconnect, confirmed in a Dialog because the settings don't come back
 *
 * Every write waits for the server (src/app/model/integrations.ts): the button shows it's pending,
 * the card changes when the answer arrives, and a failure says what happened and keeps everything.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  Drawer,
  Grid,
  Heading,
  PageHeader,
  RadioGroup,
  Skeleton,
  Stack,
  Text,
  useFormat,
  useToast,
} from '../index';
import { ApiError } from '../app/api/client';
import type { Integration, IntegrationCategory, IntegrationSettings } from '../app/api/integrations';
import { INTEGRATIONS_CAPABILITY, useConnectIntegration, useDisconnectIntegration, useIntegrations, useUpdateIntegrationSettings } from '../app/model/integrations';
import { usePersonName } from '../app/registries/refs';
import { usePermission, type Permission } from '../app/session';
import type { UrlCodec } from '../app/url/useUrlState';
import { useUrlState } from '../app/url/useUrlState';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

const CATEGORY: Record<IntegrationCategory, string> = { chat: 'Chat', calendar: 'Calendar', crm: 'CRM', accounting: 'Accounting', storage: 'Files', automation: 'Automation' };

const FREQUENCIES = [
  { value: 'realtime', label: 'As it happens', description: 'Every change, within a minute.' },
  { value: 'hourly', label: 'Every hour', description: 'Changes are batched on the hour.' },
  { value: 'daily', label: 'Once a day', description: 'At 6 am in the workspace’s time zone.' },
];
const DIRECTIONS = [
  { value: 'one-way', label: 'One way', description: 'This workspace updates the app. Changes made in the app stay there.' },
  { value: 'two-way', label: 'Both ways', description: 'Changes in either place update the other.' },
];

/** The open app's settings drawer, in the URL: /integrations?app=relay. */
const integrationsCodec: UrlCodec<{ app: string }> = {
  parse: (search) => ({ app: (new URLSearchParams(search).get('app') ?? '').slice(0, 64) }),
  serialise: (state) => (state.app ? `app=${encodeURIComponent(state.app)}` : ''),
};

export interface IntegrationsPageProps {
  /** Render the settings drawer's disconnect confirmation open (gallery and tests). */
  initialConfirmDisconnect?: boolean;
  /** Save these settings as soon as the drawer opens (gallery and tests: a pending or refused save). */
  initialSave?: IntegrationSettings;
}

export function IntegrationsPage({ initialConfirmDisconnect = false, initialSave }: IntegrationsPageProps) {
  return (
    <ExampleShell current="/settings" trail={{ items: [{ label: 'Settings', href: '/settings' }], current: 'Integrations' }}>
      <Center max="lg" gutters="lg">
        <IntegrationsContent initialConfirmDisconnect={initialConfirmDisconnect} initialSave={initialSave} />
      </Center>
    </ExampleShell>
  );
}

function IntegrationsContent({ initialConfirmDisconnect, initialSave }: IntegrationsPageProps) {
  const integrations = useIntegrations();
  const permission = usePermission(INTEGRATIONS_CAPABILITY);
  const [url, nav] = useUrlState(integrationsCodec);
  const items = integrations.data ?? [];
  const open = items.find((i) => i.id === url.app);
  const connected = items.filter((i) => i.status === 'connected');
  const available = items.filter((i) => i.status !== 'connected');

  return (
    <Stack gap="lg">
      <PageHeader
        title="Integrations"
        description="Connect the apps your team already uses. Records, renewals and approvals stay in step."
        actions={permission.allowed ? undefined : <PermissionNote permission={permission} />}
      />
      {integrations.isPending ? (
        <Grid min="md" gap="lg">
          <Skeleton shape="block" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </Grid>
      ) : integrations.isError ? (
        <Banner
          tone="danger"
          title="Integrations didn’t load"
          action={
            <Button variant="secondary" onClick={() => void integrations.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Banner>
      ) : (
        <>
          <Stack as="section" gap="md" aria-labelledby="integrations-connected">
            <Heading level={2} size={4} id="integrations-connected">
              {`Connected (${String(connected.length)})`}
            </Heading>
            {connected.length === 0 ? (
              <Text tone="muted">Nothing is connected yet. Connect an app below: it starts with hourly, one-way sync, and you can change that after.</Text>
            ) : (
              <Grid as="ul" role="list" min="md" gap="lg">
                {connected.map((i) => (
                  <IntegrationCard key={i.id} integration={i} permission={permission} onSettings={() => nav.push({ app: i.id })} />
                ))}
              </Grid>
            )}
          </Stack>
          <Stack as="section" gap="md" aria-labelledby="integrations-available">
            <Heading level={2} size={4} id="integrations-available">
              {`Available (${String(available.length)})`}
            </Heading>
            <Grid as="ul" role="list" min="md" gap="lg">
              {available.map((i) => (
                <IntegrationCard key={i.id} integration={i} permission={permission} onSettings={() => nav.push({ app: i.id })} />
              ))}
            </Grid>
          </Stack>
        </>
      )}
      {open && open.status === 'connected' && open.settings ? (
        <SettingsDrawer
          key={`${open.id}-${String(open.version)}`}
          integration={open}
          settings={open.settings}
          permission={permission}
          initialConfirmDisconnect={initialConfirmDisconnect ?? false}
          initialSave={initialSave}
          onClose={() => nav.replace({ app: '' })}
        />
      ) : null}
    </Stack>
  );
}

function IntegrationCard({ integration, permission, onSettings }: { integration: Integration; permission: Permission; onSettings: () => void }) {
  const format = useFormat();
  const toast = useToast();
  const connect = useConnectIntegration();
  const by = usePersonName(integration.connectedBy ?? '');
  const isConnected = integration.status === 'connected';
  return (
    <li>
      <Card>
        <CardHeader title={integration.name} level={3} description={CATEGORY[integration.category]} />
        <CardBody>
          <Stack gap="xs">
            <Text>{integration.description}</Text>
            {isConnected && integration.connectedAt ? (
              <Text size="caption" tone="muted">{`Connected by ${by ?? '…'} on ${format.date(integration.connectedAt)}`}</Text>
            ) : null}
          </Stack>
        </CardBody>
        <CardFooter justify="between">
          {isConnected ? (
            <Badge tone="success">Connected</Badge>
          ) : (
            <Badge tone="neutral" indicator="none">
              Not connected
            </Badge>
          )}
          {isConnected ? (
            <Button variant="secondary" onClick={onSettings} aria-label={`${integration.name} settings`}>
              Settings
            </Button>
          ) : (
            <Button
              loading={connect.isPending}
              {...gated(permission)}
              onClick={() =>
                connect.mutate(integration.id, {
                  onSuccess: (answer) => toast({ title: `${answer.name} connected`, description: 'It syncs every hour, one way. Change that in its settings.', tone: 'success' }),
                  onError: (error) =>
                    toast({ title: `Couldn’t connect ${integration.name}`, description: error instanceof ApiError ? error.message : 'Try again.', tone: 'danger', duration: Infinity }),
                })
              }
            >
              {`Connect ${integration.name}`}
            </Button>
          )}
        </CardFooter>
      </Card>
    </li>
  );
}

interface SettingsDrawerProps {
  integration: Integration;
  settings: IntegrationSettings;
  permission: Permission;
  initialConfirmDisconnect: boolean;
  initialSave: IntegrationSettings | undefined;
  onClose: () => void;
}

function SettingsDrawer({ integration, settings, permission, initialConfirmDisconnect, initialSave, onClose }: SettingsDrawerProps) {
  const toast = useToast();
  const integrations = useIntegrations();
  const update = useUpdateIntegrationSettings();
  const disconnect = useDisconnectIntegration();
  const [draft, setDraft] = useState<IntegrationSettings>(initialSave ?? settings);
  const [confirming, setConfirming] = useState(initialConfirmDisconnect);
  const autoSaved = useRef(false);
  const formId = `integration-settings-${integration.id}`;
  const conflict = update.error instanceof ApiError && update.error.status === 409;

  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { id: integration.id, settings: draft, version: integration.version },
      { onSuccess: () => toast({ title: `${integration.name} settings saved`, tone: 'success' }) },
    );
  };
  // A story or test can open the drawer mid-save, once.
  useEffect(() => {
    if (!initialSave || autoSaved.current) return;
    autoSaved.current = true;
    update.mutate({ id: integration.id, settings: initialSave, version: integration.version });
  }, [initialSave, integration.id, integration.version, update]);

  return (
    <Drawer
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={`${integration.name} settings`}
      description={`How ${integration.name} syncs with this workspace.`}
      footer={
        <Cluster justify="between">
          <Button variant="danger" onClick={() => setConfirming(true)} {...gated(permission)}>
            Disconnect
          </Button>
          <Button type="submit" form={formId} loading={update.isPending} {...gated(permission)}>
            Save changes
          </Button>
        </Cluster>
      }
    >
      <Stack as="form" id={formId} gap="lg" onSubmit={save}>
        {permission.allowed ? null : <PermissionNote permission={permission} />}
        {conflict ? (
          <Banner
            tone="warning"
            title="Someone else changed these settings"
            action={
              <Button variant="secondary" onClick={() => void integrations.refetch()}>
                Reload
              </Button>
            }
          >
            Nothing was saved. Reload to see their settings, then make your change again.
          </Banner>
        ) : update.isError ? (
          <Banner tone="danger" title="The settings weren’t saved">
            Your choices are still here. Try again.
          </Banner>
        ) : null}
        <RadioGroup label="Sync" options={FREQUENCIES} value={draft.frequency} onValueChange={(value) => setDraft({ ...draft, frequency: value as IntegrationSettings['frequency'] })} />
        <RadioGroup label="Direction" options={DIRECTIONS} value={draft.direction} onValueChange={(value) => setDraft({ ...draft, direction: value as IntegrationSettings['direction'] })} />
      </Stack>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Disconnect ${integration.name}?`}
        description="It stops syncing now, and its settings are deleted. You can connect it again later, from the start."
        footer={
          <Cluster justify="end" gap="sm">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(integration.id, {
                  onSuccess: () => {
                    setConfirming(false);
                    onClose();
                    toast({ title: `${integration.name} disconnected`, tone: 'success' });
                  },
                  onError: (error) =>
                    toast({ title: `Couldn’t disconnect ${integration.name}`, description: error instanceof ApiError ? error.message : 'Try again.', tone: 'danger', duration: Infinity }),
                })
              }
            >
              {`Disconnect ${integration.name}`}
            </Button>
          </Cluster>
        }
      />
    </Drawer>
  );
}
