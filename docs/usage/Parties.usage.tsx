import { Document, DocumentField, Parties, Party, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Parties, Party],
  whenToUse: [
    'Every document someone fills or signs: declare its parties once, by role (“employee”, “customer”), before any field that names one. `kind` is signer, cc, witness or approver; `order` is the routing order (the same order signs in parallel). Each party’s colour follows declaration order unless `color` sets it.',
    'Fields, signatures and role regions name a party by `role`; the document never names a person. The `Document`’s `actor` says which party is acting now: only its fields are editable.',
  ],
  whenNotToUse: [
    { situation: 'Naming the parties in the text (the preamble)', instead: '`DocumentTitle` with `Term`: Parties is not shown' },
    { situation: 'Generated documents nobody fills or signs (a statement)', instead: 'nothing: they have no roles' },
  ],
  do: {
    caption: 'Roles declared once; fields name a role.',
    render: () => (
      <Document label="W-4" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
          <Party role="employer" name="Employer" order={2} />
        </Parties>
        <DocumentField name="first_name" label="First name" showLabel role="employee" />
      </Document>
    ),
  },
  dont: {
    caption: 'A person instead of a role: the template can’t be sent to anyone else without editing it.',
    render: () => (
      <Document label="W-4" lifecycle="filled">
        <Text>Maya Okafor fills in:</Text>
        <DocumentField name="first_name" label="First name" showLabel />
      </Document>
    ),
  },
  accessibility: ['Not shown and not announced: the document’s own text names its parties. What the reader sees per party (a colour) always comes with its name.'],
};
