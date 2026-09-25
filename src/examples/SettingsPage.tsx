/**
 * GOLDEN EXAMPLE: the settings archetype.
 *
 * Two tiers, kept visibly apart: Personal (only you) and Workspace (everyone). A grouped sub-nav
 * picks the category; each category is its own URL in a real app (/settings/notifications).
 * Sub-nav, not tabs: categories are different things, not views of one record.
 *
 * Anatomy:
 *   shell    breadcrumb (Settings / <category>) · Settings is the current primary nav item
 *   header   title + one line on the two tiers
 *   sub-nav  <Nav label="Settings"> grouped Personal / Workspace; stacks above the panel when narrow
 *   panel    one card per category: title, description, fields, own Save in the card footer
 *   saving   Save shows the pending state; a success banner (role=status) says it saved
 */
import { useState, type FormEvent } from 'react';
import {
  Avatar,
  Banner,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Cluster,
  Heading,
  Nav,
  RadioGroup,
  Select,
  Sidebar,
  Stack,
  Switch,
  Text,
  TextField,
  type NavSection,
} from '../index';
import { ExampleShell } from './ExampleShell';

export type SettingsSection = 'profile' | 'notifications' | 'general';

/** The settings registry: tier, label and description per category. Adding a category is an entry here. */
const SECTIONS: Record<SettingsSection, { tier: 'Personal' | 'Workspace'; label: string; description: string; saved: string }> = {
  profile: { tier: 'Personal', label: 'Profile', description: 'Your name and photo on records and comments.', saved: 'Profile saved.' },
  notifications: {
    tier: 'Personal',
    label: 'Notifications',
    description: 'What we email you about. Only you see these.',
    saved: 'Notification preferences saved.',
  },
  general: {
    tier: 'Workspace',
    label: 'General',
    description: 'Applies to everyone in the Acme workspace.',
    saved: 'Workspace settings saved.',
  },
};

const hrefOf = (section: SettingsSection) => `/settings/${section}`;
const sectionOf = (href: string) => (Object.keys(SECTIONS) as SettingsSection[]).find((s) => hrefOf(s) === href);

const NAV: readonly NavSection[] = (['Personal', 'Workspace'] as const).map((tier) => ({
  label: tier,
  items: (Object.keys(SECTIONS) as SettingsSection[])
    .filter((s) => SECTIONS[s].tier === tier)
    .map((s) => ({ label: SECTIONS[s].label, href: hrefOf(s) })),
}));

const CURRENCIES = [
  { value: 'usd', label: 'US dollar (USD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'Pound sterling (GBP)' },
];

const SUMMARY = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
];

export interface SettingsPageProps {
  initialSection?: SettingsSection;
  /** Render with the save pending (gallery and tests). */
  initialSaving?: boolean;
  /** Render just after a successful save (gallery and tests). */
  initialSaved?: boolean;
}

export function SettingsPage({ initialSection = 'notifications', initialSaving = false, initialSaved = false }: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [saving, setSaving] = useState(initialSaving);
  const [saved, setSaved] = useState(initialSaved);
  const meta = SECTIONS[section];

  const navigate = (href: string) => {
    const next = sectionOf(href);
    if (!next) return;
    setSection(next);
    setSaved(false);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaved(false);
    setSaving(true);
    // Stands in for the save request.
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 600);
  };

  return (
    <ExampleShell current="/settings" trail={{ items: [{ label: 'Settings', href: '/settings' }], current: meta.label }}>
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <Stack gap="2xs">
            <Heading level={1}>Settings</Heading>
            <Text tone="muted">Personal settings apply to you alone. Workspace settings apply to every member.</Text>
          </Stack>

          <Sidebar
            sideWidth="sm"
            gap="lg"
            side={<Nav label="Settings" sections={NAV} current={hrefOf(section)} onNavigate={navigate} />}
          >
            <Stack gap="md">
              {saved ? (
                <Banner tone="success" onDismiss={() => setSaved(false)}>
                  {meta.saved}
                </Banner>
              ) : null}

              <Stack as="form" key={section} onSubmit={save}>
                <Card>
                  <CardHeader title={meta.label} description={meta.description} />
                  <CardBody>
                    <Text size="caption" tone="muted">
                      {meta.tier === 'Personal' ? 'Personal setting · only you' : 'Workspace setting · everyone in Acme'}
                    </Text>
                    {section === 'profile' ? <ProfileFields /> : null}
                    {section === 'notifications' ? <NotificationFields /> : null}
                    {section === 'general' ? <GeneralFields /> : null}
                  </CardBody>
                  <CardFooter justify="between">
                    <Text size="caption" tone="muted">
                      {saving ? 'Saving…' : saved ? 'Saved just now' : 'Saved 2026-09-22'}
                    </Text>
                    <Button type="submit" loading={saving}>
                      Save
                    </Button>
                  </CardFooter>
                </Card>
              </Stack>
            </Stack>
          </Sidebar>
        </Stack>
      </Center>
    </ExampleShell>
  );
}

function ProfileFields() {
  return (
    <>
      <Cluster gap="md">
        <Avatar name="Sam Rivera" size="lg" decorative />
        <Button variant="secondary" size="sm">
          Upload photo
        </Button>
      </Cluster>
      <TextField label="Display name" defaultValue="Sam Rivera" autoComplete="name" />
      <TextField label="Email" type="email" defaultValue="sam.rivera@example.com" autoComplete="email" description="Where notifications go." />
    </>
  );
}

function NotificationFields() {
  return (
    <>
      <Switch label="Mentions and replies" description="When someone mentions you or replies to your comment." defaultChecked />
      <Switch label="Status changes" description="When a record you own changes status." defaultChecked />
      <Switch label="Product news" description="A few emails a year about new features." />
      <RadioGroup label="Summary email" orientation="horizontal" options={SUMMARY} defaultValue="weekly" />
    </>
  );
}

function GeneralFields() {
  return (
    <>
      <TextField label="Workspace name" defaultValue="Acme" />
      <Select label="Default currency" description="Used for new records. Existing records keep theirs." options={CURRENCIES} defaultValue="usd" />
      <Switch label="Guests can view records" description="People outside the workspace can open records shared with them." />
    </>
  );
}
