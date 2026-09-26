import { Button, Cluster, Dialog, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Dialog],
  whenToUse: [
    'Confirming a destructive or irreversible action (`size="sm"`, danger button that repeats the verb).',
    'A quick create or edit of a light record: two or three fields.',
  ],
  whenNotToUse: [
    { situation: 'A long or multi-step form', instead: 'a full page from the Create and edit example' },
    { situation: 'Telling people something happened', instead: '`Toast` or `Banner`' },
    { situation: 'Confirming something that can be undone (archive, move, remove a tag)', instead: 'do it at once and offer Undo in a `Toast` (its `action`); keep the dialog for what can’t be undone, and for bulk actions' },
    { situation: 'Choosing an action', instead: '`Menu`' },
  ],
  do: {
    caption: 'A focused quick-create: a short title, the fields, and the primary action last.',
    render: () => (
      <Dialog
        title="New record"
        description="Records start as drafts."
        trigger={<Button icon="plus">New record</Button>}
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Create record</Button>
          </>
        }
      >
        <TextField label="Name" />
      </Dialog>
    ),
  },
  dont: {
    caption: 'A vague confirm: “Are you sure?” with “OK” forces people to reread what they clicked.',
    render: () => (
      <Cluster>
        <Dialog
          size="sm"
          title="Are you sure?"
          trigger={<Button variant="danger">Delete record</Button>}
          footer={
            <>
              <Button variant="secondary">Cancel</Button>
              <Button>OK</Button>
            </>
          }
        />
      </Cluster>
    ),
  },
  accessibility: [
    '`title` is required and names the dialog; `description` is announced with it.',
    'Focus moves into the dialog, is trapped there, and returns to the trigger on close. Escape closes it.',
    'The close button is icon-only, so it has a name (`closeLabel`, default “Close”).',
  ],
};
