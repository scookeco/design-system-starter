import { Document, DocumentField, Parties, Party, RoleRegion } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [RoleRegion],
  whenToUse: ['A part of a document that belongs to one party, with more than fields in it (a heading, instructions): a form’s “Employers only” block. Every field inside is that party’s unless it says otherwise. It draws nothing of its own.'],
  whenNotToUse: [
    { situation: 'Only a group of fields', instead: '`DocumentFieldset` with `role`' },
    { situation: 'One field', instead: '`role` on the field' },
  ],
  do: {
    caption: 'One block assigned to the employer.',
    render: () => (
      <Document label="Form" lifecycle="filled">
        <Parties>
          <Party role="employer" name="Employer" />
        </Parties>
        <RoleRegion role="employer">
          <DocumentField name="ein" label="EIN" type="ein" showLabel />
        </RoleRegion>
      </Document>
    ),
  },
  dont: {
    caption: 'A block with no role: its fields go to nobody, and the validator rejects a document to be filled with unassigned fields.',
    render: () => (
      <Document label="Form" lifecycle="filled">
        <DocumentField name="ein" label="EIN" type="ein" showLabel />
      </Document>
    ),
  },
  accessibility: ['A plain block: headings and fields inside keep their own semantics; nothing is announced for the role.'],
};
