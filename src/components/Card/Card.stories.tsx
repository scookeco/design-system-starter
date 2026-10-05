import type { Meta, StoryObj } from '@storybook/react-vite';
import { createFormatter } from '../../format/format';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { TextField } from '../TextField/TextField';
import { Badge } from '../Badge/Badge';
import { Grid } from '../../primitives/Grid/Grid';
import { Card, CardBody, CardFooter, CardHeader, CardLink } from './Card';
import { PlusIcon } from '../Icon/icons';

/** Stories format with the system's formats, like apps do (apps use useFormat()). */
const f = createFormatter({ locale: 'en-US', timeZone: 'UTC' });

function ProfileCard({ header = true, footer = 'end', actions = false }: { header?: boolean; footer?: 'end' | 'between' | 'none'; actions?: boolean }) {
  return (
    <Card>
      {header ? (
        <CardHeader
          title="Profile"
          description="Your name and photo on records and comments."
          actions={actions ? <Button variant="ghost" size="sm" icon={PlusIcon}>Add</Button> : undefined}
        />
      ) : null}
      <CardBody>
        <TextField label="Display name" defaultValue="Sam Rivera" />
      </CardBody>
      {footer === 'none' ? null : (
        <CardFooter justify={footer}>
          {footer === 'between' ? (
            <Text size="caption" tone="muted">
              {`Saved ${f.date('2026-09-22')}`}
            </Text>
          ) : null}
          <Button>Save</Button>
        </CardFooter>
      )}
    </Card>
  );
}

const meta = { title: 'Components/Card', component: ProfileCard } satisfies Meta<typeof ProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FooterBetween: Story = { args: { footer: 'between' } };
export const HeaderActions: Story = { args: { actions: true, footer: 'none' } };
export const BodyOnly: Story = { args: { header: false, footer: 'none' } };

/** A grid of choices, each card one link; one not available yet, shown so the set is complete. */
export const Links: Story = {
  render: () => (
    <Grid as="ul" role="list" min="sm" gap="md">
      <li>
        <CardLink href="#healthcare" title="Healthcare" description="Provider agreements with BAAs and payer contracts." meta="8 counterparties · 2 custom fields" />
      </li>
      <li>
        <CardLink href="#retail" title="Retail" description="Supply and marketplace agreements with chargebacks and returns." meta="9 counterparties · 2 custom fields" />
      </li>
      <li>
        <CardLink
          href="#education"
          title="Education"
          description="Enrollment, vendor and research agreements for schools."
          state="unavailable"
          badge={<Badge tone="neutral" indicator="none">Coming soon</Badge>}
        />
      </li>
    </Grid>
  ),
};
