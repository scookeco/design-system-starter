import { Button, Cluster } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Button],
  whenToUse: [
    'To run an action on this page: save, create, delete, open a dialog.',
    'One `primary` per view for the main next step; `secondary` for the rest; `ghost` in dense rows and toolbars.',
    '`danger` for the action that destroys data, usually as the confirm button of a Dialog.',
  ],
  whenNotToUse: [
    { situation: 'Going to another page or record', instead: 'a link (`<a href>`), or a `Nav` or `Breadcrumbs` item' },
    { situation: 'Choosing one of several actions from a crowded header', instead: '`Menu` behind a "More" button' },
    { situation: 'Toggling a setting on or off', instead: '`Switch`' },
  ],
  do: {
    caption: 'One primary action, with the alternative as secondary. Labels are verb-first and say what happens.',
    render: () => (
      <Cluster gap="sm">
        <Button variant="secondary">Cancel</Button>
        <Button>Create record</Button>
      </Cluster>
    ),
  },
  dont: {
    caption: 'Two primaries compete for the same attention, and "OK" doesn’t say what it does.',
    render: () => (
      <Cluster gap="sm">
        <Button>Save draft</Button>
        <Button>OK</Button>
      </Cluster>
    ),
  },
  accessibility: [
    'A visible label is required; it is the accessible name. An icon-only button needs `aria-label` and a `Tooltip`.',
    '`loading` keeps the button focusable and its name intact, and blocks activation with `aria-disabled`.',
    'Defaults to `type="button"`; set `type="submit"` on the form’s submit button.',
  ],
};
