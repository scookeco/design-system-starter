import { Clause, ClauseRef, DocumentViewer, Exhibit, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Exhibit],
  whenToUse: [
    'A schedule attached to an agreement and generated with it: a DPA (Exhibit A), an SLA (Exhibit B), an escrow schedule. Letters come from the order attached.',
    'Its clauses restart at 1. A `ClauseRef` into it reads “Section 2 of Exhibit B”, one from it to the body reads “Section 7 of the Agreement” (`documentName` on the viewer), and `<ClauseRef to="dpa" />` names the exhibit itself.',
  ],
  whenNotToUse: [
    { situation: 'A separate agreement that refers to this one (an Order Form, an Amendment)', instead: 'its own DocumentViewer, naming this agreement in plain text' },
    { situation: 'A section of the agreement itself', instead: '`Clause`' },
  ],
  do: {
    caption: 'An exhibit named by reference, never by a typed letter: attach another before it and every “Exhibit A” follows.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Clause id="privacy" title="Data Privacy">
          <Text>
            Personal data is processed under <ClauseRef to="dpa" />.
          </Text>
        </Clause>
        <Exhibit id="dpa" title="Data Processing Agreement">
          <Clause id="roles" title="Roles">
            <Text>Customer is the controller and Provider the processor.</Text>
          </Clause>
        </Exhibit>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A typed “Exhibit A” heading and numbers that carry on from the body: references to it break the first time the order changes.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Text>EXHIBIT A — Data Processing Agreement</Text>
        <Text>26. Roles. Customer is the controller and Provider the processor.</Text>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'An exhibit is a `section` named by its heading (“Exhibit A Data Processing Agreement”) at the viewer’s top heading level; its clauses’ headings start one level below.',
    'A reference to an exhibit, or into one, is a link that moves focus to it, with scroll padding clear of sticky content.',
  ],
};
