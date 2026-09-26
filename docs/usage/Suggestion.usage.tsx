import { Suggestion, Textarea } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Suggestion],
  whenToUse: [
    'A text field where the AI can suggest what comes next (a description, a reply): the suggestion shows as ghost text, Tab accepts, Esc dismisses, typing over it ignores it.',
    'The caller owns the value and the suggestion: append on `onAccept`, drop on `onDismiss`. Keep what was there before, so one Undo restores it.',
    'Put the AI action (“Suggest description”) beside the field, never in place of writing it by hand.',
  ],
  whenNotToUse: [
    { situation: 'A long draft that needs review before it lands', instead: 'a generated block marked with `AiMarker`, or `ReviewChanges` for a rewrite' },
    { situation: 'A field with no AI', instead: '`Textarea`' },
  ],
  do: {
    caption: 'Muted ghost text after what was typed, marked as AI, with the keys and buttons to accept or dismiss.',
    render: () => (
      <Suggestion
        label="Description"
        value="Covers facilities maintenance,"
        onValueChange={() => undefined}
        suggestion=" cleaning and security for both offices."
        onAccept={() => undefined}
        onDismiss={() => undefined}
      />
    ),
  },
  dont: {
    caption: 'AI text written straight into the value: it looks like the person’s own words and nobody accepted it.',
    render: () => <Textarea label="Description" defaultValue="Covers facilities maintenance, cleaning and security for both offices." />,
  },
  accessibility: [
    'The ghost text is never part of the value, so the field reads as what was typed; the suggestion is in the field’s description, and a polite status says “Suggestion ready” once, never character by character.',
    'Tab accepts only while a complete suggestion shows; otherwise Tab moves focus as usual. Esc dismisses without closing a surrounding dialog.',
    'Accept and Dismiss buttons give pointer and switch users the same choice; the mark is text (“AI suggestion”), not colour alone.',
  ],
};
