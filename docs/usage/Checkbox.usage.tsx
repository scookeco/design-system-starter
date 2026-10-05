import { Button, Checkbox, Stack } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Checkbox],
  whenToUse: [
    'An independent yes/no inside a form that is saved with the form.',
    'Several independent choices from a short list; `indeterminate` for a “select all” parent.',
    'Row selection in a table: `hideLabel`, with a label naming the row (“Select Hardware lease”), so the name still says what is ticked.',
    '`variant="tile"` for a set of choices laid out as tiles (document types, add-ons): the whole tile is the target, and a checked one fills.',
    '`category` (1–6) on tiles when the choices are of different kinds, as a diagram’s bands are: the tile takes that category’s colours.',
  ],
  whenNotToUse: [
    { situation: 'A setting that applies immediately', instead: '`Switch`' },
    { situation: 'Exactly one of several options', instead: '`RadioGroup`' },
    { situation: 'Colouring tiles by status (warning, danger) to mean a kind of thing', instead: '`category`: statuses say something is wrong' },
    { situation: 'Restyling Checkbox into a tile', instead: '`variant="tile"`' },
  ],
  do: {
    caption: 'Part of a form: nothing happens until Save.',
    render: () => (
      <Stack gap="md" align="start">
        <Checkbox label="Send a copy to the record owner" defaultChecked />
        <Button variant="secondary">Save</Button>
      </Stack>
    ),
  },
  dont: {
    caption: 'A negative label makes checked mean “no”. Phrase the option positively.',
    render: () => <Checkbox label="Don’t send me updates" />,
  },
  accessibility: [
    '`label` is required and clicking it toggles the box; `description` is linked to the control.',
    'The mixed state is exposed as `aria-checked="mixed"`, not only drawn.',
    'A tile is still one checkbox with its label: the checkbox’s own hit area covers the tile, so all of it is the target and nothing sits over the focused control, and the focus ring goes round the tile. Checked is a fill and a solid outline, unchecked a dashed one, so the state never rests on colour alone.',
  ],
};
