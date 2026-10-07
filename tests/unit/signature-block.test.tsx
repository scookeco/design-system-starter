// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignatureBlock } from '../../src/index';

afterEach(cleanup);

describe('SignatureBlock', () => {
  it('unsigned: labelled tags in the recipient’s colour', () => {
    const { container } = render(<SignatureBlock name="Maya Okafor" title="Legal counsel" recipient={3} />);
    const block = container.querySelector('dl');
    expect(block?.getAttribute('data-recipient')).toBe('3');
    expect([...container.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Signature:', 'Name:', 'Title:', 'Date Signed:']);
    expect([...container.querySelectorAll('.signature-block__tag')].map((t) => t.textContent)).toEqual(['Sign', 'Full Name', 'Title', 'Date Signed']);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('onSign makes the Sign tag a named button', () => {
    const onSign = vi.fn();
    render(<SignatureBlock name="Maya Okafor" onSign={onSign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign as Maya Okafor' }));
    expect(onSign).toHaveBeenCalledOnce();
  });

  it('signed: the signature and values replace the tags', () => {
    const { container } = render(<SignatureBlock name="Maya Okafor" title="Legal counsel" signature="Maya Okafor" date="14 Oct 2026" onSign={() => undefined} />);
    expect(container.querySelector('dl')?.getAttribute('data-signed')).toBe('true');
    expect(container.querySelector('.signature-block__signature')?.textContent).toBe('Maya Okafor');
    expect([...container.querySelectorAll('.signature-block__text')].map((t) => t.textContent)).toEqual(['Maya Okafor', 'Legal counsel', '14 Oct 2026']);
    expect(container.querySelectorAll('.signature-block__tag')).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
