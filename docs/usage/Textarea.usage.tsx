import { Textarea } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Textarea],
  whenToUse: ['Free text that may run to several lines: notes, descriptions, messages.'],
  whenNotToUse: [
    { situation: 'A single value such as a name or an amount', instead: '`TextField`' },
    { situation: 'Formatted content', instead: 'a rich-text editor proposed through the decision ladder' },
  ],
  do: {
    caption: 'Say what the text is for, and what happens to it.',
    render: () => <Textarea label="Notes" description="Visible to everyone in this workspace." />,
  },
  dont: {
    caption: 'A multi-line box for a one-line answer invites the wrong input.',
    render: () => <Textarea label="Postcode" />,
  },
  accessibility: [
    'Same anatomy as every field: required `label`, `description` and `error` linked to the control.',
    'State a character limit in the description before people hit it.',
  ],
};
