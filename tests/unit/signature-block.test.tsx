// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Document, Parties, Party, SignatureBlock, type DocumentValues } from '../../src/index';

afterEach(cleanup);

function Block({ values = {}, onSign, lifecycle = 'filled' as const, actor }: { values?: DocumentValues; onSign?: () => void; lifecycle?: 'filled' | 'executed'; actor?: string }) {
  return (
    <Document label="Agreement" lifecycle={lifecycle} values={values} actor={actor}>
      <Parties>
        <Party role="provider" name="Acme Corp" />
        <Party role="customer" name="Globex Inc." color={3} />
      </Parties>
      <SignatureBlock role="customer" onSign={onSign} />
    </Document>
  );
}

describe('SignatureBlock', () => {
  it('unsigned: labelled tags in the party’s colour, bound to its role', () => {
    const { container } = render(<Block />);
    expect(container.querySelector('dl')?.getAttribute('data-role')).toBe('customer');
    expect([...container.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Signature:', 'Name:', 'Title:', 'Date Signed:']);
    expect([...container.querySelectorAll('.signature-field__tag')].map((t) => t.textContent)).toEqual(['Sign', 'Full Name', 'Title', 'Date Signed']);
    expect([...container.querySelectorAll('.signature-field')].map((t) => t.getAttribute('data-recipient'))).toEqual(['3', '3', '3', '3']);
    expect([...container.querySelectorAll('[data-doc]')].map((t) => t.getAttribute('data-doc'))).toEqual(
      expect.arrayContaining(['signature', 'field', 'field', 'date-signed']),
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('onSign makes the Sign tag a button named for the party, only while that party can act', () => {
    const onSign = vi.fn();
    const { rerender } = render(<Block onSign={onSign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign as Globex Inc.' }));
    expect(onSign).toHaveBeenCalledOnce();
    rerender(<Block onSign={onSign} actor="provider" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('signed: the signature and values from the document replace the tags', () => {
    const values = {
      signature: { customer: 'Jon Park' },
      date_signed: { customer: '2026-10-14' },
      customer_signer_name: 'Jon Park',
      customer_signer_title: 'Operations director',
    };
    const { container } = render(<Block values={values} lifecycle="executed" onSign={() => undefined} />);
    expect(container.querySelector('dl')?.getAttribute('data-signed')).toBe('true');
    expect(container.querySelector('.signature-field__drawn')?.textContent).toBe('Jon Park');
    expect([...container.querySelectorAll('.signature-field__text')].map((t) => t.textContent)).toEqual(['Jon Park', 'Operations director', 'Oct 14, 2026']);
    expect(container.querySelectorAll('.signature-field__tag')).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
