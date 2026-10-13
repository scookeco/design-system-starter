// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Acknowledge, DateSigned, Document, DocumentField, Initials, Parties, Party, RoleRegion, Signature } from '../../src/index';

afterEach(cleanup);

const W4_PARTIES = (
  <Parties>
    <Party role="employee" name="Employee" order={1} />
    <Party role="employer" name="Employer" order={2} />
    <Party role="hr" name="HR" kind="cc" />
  </Parties>
);

describe('Parties', () => {
  it('declare roles for tooling, not for the reader', () => {
    const { container } = render(<Document label="W-4">{W4_PARTIES}</Document>);
    const section = container.querySelector('section[data-doc="parties"]');
    expect(section?.hasAttribute('hidden')).toBe(true);
    expect([...container.querySelectorAll('[data-doc="party"]')].map((p) => [p.getAttribute('data-role'), p.getAttribute('data-kind'), p.getAttribute('data-order')])).toEqual([
      ['employee', 'signer', '1'],
      ['employer', 'signer', '2'],
      ['hr', 'cc', '1'],
    ]);
  });

  it('colour each party’s tabs by declaration order', () => {
    const { container } = render(
      <Document label="W-4">
        {W4_PARTIES}
        <Signature role="employee" />
        <Signature role="employer" />
      </Document>,
    );
    expect([...container.querySelectorAll('[data-doc="signature"]')].map((s) => s.getAttribute('data-recipient'))).toEqual(['1', '2']);
  });
});

describe('actor and RoleRegion', () => {
  it('only the acting party’s fields are editable; a role region gives its role to every field inside', () => {
    const { container } = render(
      <Document label="W-4" lifecycle="filled" actor="employee">
        {W4_PARTIES}
        <DocumentField name="first_name" label="First name" role="employee" />
        <RoleRegion role="employer">
          <DocumentField name="ein" label="EIN" type="ein" />
        </RoleRegion>
      </Document>,
    );
    expect(screen.getByRole('textbox', { name: 'First name' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'EIN' })).toBeNull();
    expect(container.querySelector('[data-name="ein"]')?.getAttribute('data-role')).toBe('employer');
    expect(container.querySelector('[data-doc="role-region"]')?.getAttribute('data-role')).toBe('employer');
  });
});

describe('Signature, Initials and DateSigned', () => {
  it('are tags until signed, then the values from the document', () => {
    const { container, rerender } = render(
      <Document label="W-4">
        {W4_PARTIES}
        <Signature role="employee" />
        <Initials role="employee" eachPage />
        <DateSigned role="employee" />
      </Document>,
    );
    expect([...container.querySelectorAll('.signature-field__tag')].map((t) => t.textContent)).toEqual(['Sign', 'Initial', 'Date Signed']);
    expect(container.querySelector('[data-doc="initials"]')?.getAttribute('data-each-page')).toBe('true');
    rerender(
      <Document label="W-4" values={{ signature: { employee: 'Maya Okafor' }, initials: { employee: 'MO' }, date_signed: { employee: '2026-10-14' } }}>
        {W4_PARTIES}
        <Signature role="employee" />
        <Initials role="employee" eachPage />
        <DateSigned role="employee" />
      </Document>,
    );
    expect(container.textContent).toBe('Maya OkaforMOOct 14, 2026');
  });
});

describe('Acknowledge', () => {
  it('is a required box, a signature and the date for one party', () => {
    const onSign = vi.fn();
    render(
      <Document label="Handbook" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Acknowledge role="employee" text="I have read and agree to the Employee Handbook" onSign={onSign} />
      </Document>,
    );
    const box = screen.getByRole('checkbox', { name: 'I have read and agree to the Employee Handbook' });
    expect(box).toHaveProperty('required', true);
    expect(box.closest('[data-name]')?.getAttribute('data-name')).toBe('employee_acknowledged');
    fireEvent.click(screen.getByRole('button', { name: 'Sign as Employee' }));
    expect(onSign).toHaveBeenCalledOnce();
    expect(screen.getByRole('group', { name: 'Acknowledgement' })).toBeTruthy();
  });
});
