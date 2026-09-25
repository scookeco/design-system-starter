import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { TextField } from '../TextField/TextField';
import { Card, CardBody, CardFooter, CardHeader } from './Card';

function ProfileCard({ header = true, footer = 'end', actions = false }: { header?: boolean; footer?: 'end' | 'between' | 'none'; actions?: boolean }) {
  return (
    <Card>
      {header ? (
        <CardHeader
          title="Profile"
          description="Your name and photo on records and comments."
          actions={actions ? <Button variant="ghost" size="sm" icon="plus">Add</Button> : undefined}
        />
      ) : null}
      <CardBody>
        <TextField label="Display name" defaultValue="Sam Rivera" />
      </CardBody>
      {footer === 'none' ? null : (
        <CardFooter justify={footer}>
          {footer === 'between' ? (
            <Text size="caption" tone="muted">
              Saved 2026-09-22
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
