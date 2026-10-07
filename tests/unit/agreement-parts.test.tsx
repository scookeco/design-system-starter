// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Change,
  Clause,
  ClauseNote,
  ClauseRef,
  DocumentTitle,
  DocumentViewer,
  Exhibit,
  Recital,
  Recitals,
  SignatureBlock,
  SignaturePage,
  SignatureParty,
  Text,
} from '../../src/index';

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  errors.mockRestore();
});

const numbers = (root: ParentNode) => [...root.querySelectorAll('.clause__number')].map((n) => n.textContent);
const nb = (s: string) => s.replace(/ /g, ' ');

describe('Exhibit', () => {
  function Msa() {
    return (
      <DocumentViewer label="Agreement">
        <Clause id="privacy" title="Privacy">
          <Text>
            See <ClauseRef to="dpa" /> and <ClauseRef to="dpa-roles" />.
          </Text>
        </Clause>
        <Clause id="cap" title="Liability">
          <Text>Capped.</Text>
        </Clause>
        <Exhibit id="dpa" title="Data Processing Agreement">
          <Clause id="dpa-roles" title="Roles">
            <Text>
              As in <ClauseRef to="privacy" />.
            </Text>
          </Clause>
        </Exhibit>
        <Exhibit id="sla" title="Service Level Agreement">
          <Clause id="sla-a" title="Availability">
            <Text>99.9%.</Text>
          </Clause>
          <Clause id="sla-b" title="Remedy">
            <Text>
              See <ClauseRef to="sla-a" /> and <ClauseRef to="dpa-roles" />.
            </Text>
          </Clause>
        </Exhibit>
      </DocumentViewer>
    );
  }

  it('letters exhibits in order and restarts numbering in each', () => {
    const { container } = render(<Msa />);
    expect([...container.querySelectorAll('.exhibit__letter')].map((n) => n.textContent)).toEqual([nb('Exhibit A'), nb('Exhibit B')]);
    expect(numbers(container)).toEqual(['1.', '2.', '1.', '1.', '2.']);
    expect(screen.getByRole('heading', { level: 2, name: `${nb('Exhibit A')}Data Processing Agreement` })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: '1.Roles' })).toBeTruthy();
  });

  it('names where a reference goes when it crosses into or out of an exhibit', () => {
    render(<Msa />);
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links).toEqual([
      nb('Exhibit A'),
      `${nb('Section 1')} of ${nb('Exhibit A')}`,
      `${nb('Section 1')} of the Agreement`,
      nb('Section 1'),
      `${nb('Section 1')} of ${nb('Exhibit A')}`,
    ]);
  });
});

describe('SignaturePage', () => {
  it('puts each party’s name over its block', () => {
    render(
      <SignaturePage>
        <SignatureParty name="Acme Corp">
          <SignatureBlock name="Maya Okafor" />
        </SignatureParty>
        <SignatureParty name="Globex Inc.">
          <SignatureBlock name="Jon Park" />
        </SignatureParty>
        <SignatureParty name="Escrow Agent">
          <SignatureBlock name="Rita Alvarez" />
        </SignatureParty>
      </SignaturePage>,
    );
    const page = screen.getByRole('region', { name: 'Signatures' });
    expect([...page.querySelectorAll('.signature-party__name')].map((n) => n.textContent)).toEqual(['Acme Corp', 'Globex Inc.', 'Escrow Agent']);
    expect(page.textContent).toContain('IN WITNESS WHEREOF');
  });
});

describe('DocumentTitle and Recitals', () => {
  it('titles the document one level above its clauses and prefixes each recital', () => {
    render(
      <DocumentViewer label="Agreement">
        <DocumentTitle title="Master Services Agreement" number="No. MSA-1">
          Between Acme and Globex.
        </DocumentTitle>
        <Recitals closing="the Parties agree:">
          <Recital>Provider operates a platform;</Recital>
        </Recitals>
      </DocumentViewer>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Master Services Agreement' })).toBeTruthy();
    expect(screen.getByText('WHEREAS, Provider operates a platform;')).toBeTruthy();
    expect(screen.getByText('NOW, THEREFORE, the Parties agree:')).toBeTruthy();
  });
});

describe('Change', () => {
  it('marks insertions and deletions with their author, outside the copied text', () => {
    const { container } = render(
      <Text>
        <Change kind="insert" author="Maya Okafor" color={3}>
          two times
        </Change>{' '}
        <Change kind="delete">the total</Change> <Change kind="move-to">moved</Change>
      </Text>,
    );
    const [ins, del, move] = [...container.querySelectorAll('.change')];
    expect(ins?.tagName).toBe('INS');
    expect(ins?.getAttribute('data-label')).toBe('Inserted by Maya Okafor');
    expect(ins?.getAttribute('data-color')).toBe('3');
    expect(ins?.textContent).toBe('two times');
    expect(del?.tagName).toBe('DEL');
    expect(del?.getAttribute('data-label')).toBe('Deleted');
    expect(move?.tagName).toBe('INS');
  });

  it('a deleted clause keeps its number, and the clauses after it keep theirs', () => {
    const { container } = render(
      <DocumentViewer label="Compared">
        <Clause id="a" title="One">
          <Text>One.</Text>
        </Clause>
        <Clause id="b" title="Two" change={{ kind: 'delete', author: 'Jon Park' }}>
          <Text>Two.</Text>
        </Clause>
        <Clause id="c" title="Three">
          <Text>Three.</Text>
        </Clause>
      </DocumentViewer>,
    );
    expect(numbers(container)).toEqual(['1.', '2.', '3.']);
    const deleted = container.querySelector('[data-clause="b"]');
    expect(deleted?.getAttribute('data-change')).toBe('delete');
    expect(deleted?.getAttribute('data-change-label')).toBe('Deleted by Jon Park');
  });
});

describe('ClauseNote', () => {
  it('is a note after the clause heading, naming the position or the source in words', () => {
    render(
      <DocumentViewer label="Agreement">
        <Clause id="cap" title="Liability" note={<ClauseNote position="seller-favored">Short cap</ClauseNote>}>
          <Text>Capped.</Text>
        </Clause>
        <Clause id="sub" title="Sub-processors" note={<ClauseNote source="DPA" color={5} />}>
          <Text>Listed.</Text>
        </Clause>
      </DocumentViewer>,
    );
    const notes = screen.getAllByRole('note');
    expect(notes.map((n) => n.textContent)).toEqual(['PositionSeller-favoredShort cap', 'SourceDPA']);
    expect(notes[1]?.getAttribute('data-color')).toBe('5');
  });
});
