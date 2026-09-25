// @vitest-environment jsdom
/**
 * WCAG 2.2 criteria that are about a flow rather than a single rendered story, asserted on the
 * golden examples. Each audit is a function with a negative control that proves it can fail.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SetupWizard } from '../../src/examples/SetupWizard';
import { SignInPage, type SignInStep } from '../../src/examples/SignInPage';

afterEach(cleanup);

// jsdom has no ResizeObserver; Radix measures its hidden form inputs with one inside a <form>.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const TEXT_ENTRY = 'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], textarea';
const labelOf = (input: Element) => ((input as HTMLInputElement).labels?.[0]?.textContent ?? '').trim();
const autocompleteOf = (input: Element) => (input.getAttribute('autocomplete') ?? '').split(/\s+/);

/**
 * SC 3.3.8 Accessible Authentication (Minimum). Returns what stops a password manager, paste or
 * a visible password from doing the remembering:
 * - the account identifier in a password form has autocomplete="username";
 * - a password has autocomplete current-password or new-password, and a show-password button;
 * - a verification code has autocomplete="one-time-code" and a numeric keyboard;
 * - no field blocks paste, and there is no CAPTCHA-style cognitive test.
 */
const authenticationProblems = (root: HTMLElement): string[] => {
  const problems: string[] = [];
  for (const form of root.querySelectorAll('form')) {
    const passwords = [...form.querySelectorAll('input[type="password"]')];
    for (const password of passwords) {
      const tokens = autocompleteOf(password);
      if (!tokens.includes('current-password') && !tokens.includes('new-password')) problems.push(`${labelOf(password)}: autocomplete is not current-password or new-password`);
      const toggles = [...form.querySelectorAll('button[aria-controls]')].filter((b) => b.getAttribute('aria-controls')?.split(/\s+/).includes(password.id));
      if (!password.id || toggles.length === 0) problems.push(`${labelOf(password)}: no show-password button`);
    }
    if (passwords.length > 0) {
      const identifier = form.querySelector('input[type="email"], input[type="text"], input:not([type])');
      if (identifier && !autocompleteOf(identifier).includes('username')) problems.push(`${labelOf(identifier)}: the account identifier needs autocomplete="username"`);
    }
  }
  for (const input of root.querySelectorAll(TEXT_ENTRY)) {
    if (/\bcode\b/i.test(labelOf(input))) {
      if (!autocompleteOf(input).includes('one-time-code')) problems.push(`${labelOf(input)}: a verification code needs autocomplete="one-time-code"`);
      if (input.getAttribute('inputmode') !== 'numeric') problems.push(`${labelOf(input)}: a verification code needs inputmode="numeric"`);
    }
    // fireEvent returns false when a handler called preventDefault().
    if (!fireEvent.paste(input)) problems.push(`${labelOf(input)}: blocks paste`);
  }
  if (/captcha/i.test(root.innerHTML)) problems.push('a CAPTCHA-style cognitive test');
  return problems;
};

describe('Accessible authentication (SC 3.3.8)', () => {
  const steps: SignInStep[] = ['start', 'password', 'verify'];

  it.each(steps)('the %s step lets a password manager, paste or a visible password do the remembering', (step) => {
    const { container } = render(<SignInPage initialStep={step} initialEmail="sam.rivera@example.com" />);
    expect(authenticationProblems(container)).toEqual([]);
  });

  it('fills the password step from a password manager: username, then current-password', () => {
    render(<SignInPage initialStep="password" />);
    expect(screen.getByLabelText('Work email').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
  });

  it('shows and hides the password without losing it, its autofill or focus', () => {
    render(<SignInPage initialStep="password" />);
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(password, { target: { value: 'correct horse' } });
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('aria-controls')).toBe(password.id);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.focus();
    fireEvent.click(toggle);
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(password.value).toBe('correct horse');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(toggle);
    expect(password.type).toBe('password');
  });

  it('hides a shown password again when the form is submitted', () => {
    render(<SignInPage initialStep="password" initialEmail="sam.rivera@example.com" />);
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');
    fireEvent.submit(password.form as HTMLFormElement);
    expect(password.type).toBe('password');
  });

  it('asks for the verification code with one-time-code autofill and accepts a pasted code', () => {
    render(<SignInPage initialStep="verify" />);
    const code = screen.getByLabelText('6-digit code');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect(fireEvent.paste(code)).toBe(true);
  });

  it('negative control: fails a form that blocks paste, has no autofill hints, no show-password button and a CAPTCHA', () => {
    const block = (event: { preventDefault: () => void }) => event.preventDefault();
    const { container } = render(
      <form>
        <label htmlFor="bad-email">Email</label>
        <input id="bad-email" type="email" autoComplete="email" />
        <label htmlFor="bad-password">Password</label>
        <input id="bad-password" type="password" onPaste={block} />
        <label htmlFor="bad-code">Security code</label>
        <input id="bad-code" type="text" />
        <div className="captcha">Type the letters in the image</div>
      </form>,
    );
    expect(authenticationProblems(container)).toEqual([
      'Password: autocomplete is not current-password or new-password',
      'Password: no show-password button',
      'Email: the account identifier needs autocomplete="username"',
      'Password: blocks paste',
      'Security code: a verification code needs autocomplete="one-time-code"',
      'Security code: a verification code needs inputmode="numeric"',
      'a CAPTCHA-style cognitive test',
    ]);
  });
});

/** The questions a step asks: the name of every text field and radio group in its form. */
const questionsOn = (form: HTMLElement) => [
  ...within(form)
    .queryAllByRole('textbox')
    .map((field) => labelOf(field)),
  ...within(form)
    .queryAllByRole('radiogroup')
    .map((group) => document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? ''),
];

/** SC 3.3.7 Redundant Entry: questions asked on more than one step of the same process. */
const askedAgain = (steps: readonly (readonly string[])[]) => {
  const seen = new Set<string>();
  const again = new Set<string>();
  for (const questions of steps) {
    for (const question of new Set(questions)) (seen.has(question) ? again : seen).add(question);
  }
  return [...again];
};

describe('Redundant entry (SC 3.3.7)', () => {
  const form = () => document.getElementById('setup-step') as HTMLElement;
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  it('asks each question once, shows every earlier answer on review, and brings answers back when editing', () => {
    render(<SetupWizard />);
    const steps: string[][] = [];

    steps.push(questionsOn(form()));
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace name' }), { target: { value: 'Acme Legal' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace address' }), { target: { value: 'acme-legal' } });
    next();

    steps.push(questionsOn(form()));
    fireEvent.change(screen.getByRole('textbox', { name: 'Email addresses (optional)' }), { target: { value: 'priya@example.com' } });
    next();

    steps.push(questionsOn(form()));
    fireEvent.click(screen.getByRole('radio', { name: /Team/ }));
    next();

    // Review asks nothing: it shows what was given.
    steps.push(questionsOn(form()));
    expect(steps).toEqual([['Workspace name', 'Workspace address'], ['Email addresses (optional)'], ['Plan'], []]);
    expect(askedAgain(steps)).toEqual([]);
    const review = within(form());
    for (const answer of ['Acme Legal', 'acme.app/acme-legal', 'priya@example.com', 'Team']) expect(review.getByText(answer)).toBeTruthy();

    // Editing an answer returns to its step with every answer still filled in.
    fireEvent.click(screen.getByRole('button', { name: 'Edit workspace' }));
    expect((screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement).value).toBe('Acme Legal');
    expect((screen.getByRole('textbox', { name: 'Workspace address' }) as HTMLInputElement).value).toBe('acme-legal');
    next();
    expect((screen.getByRole('textbox', { name: 'Email addresses (optional)' }) as HTMLTextAreaElement).value).toBe('priya@example.com');

    // So does going back.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement).value).toBe('Acme Legal');
  });

  it('negative control: catches a flow that asks for the same thing twice', () => {
    expect(askedAgain([['Workspace name', 'Workspace address'], ['Plan'], ['Workspace name', 'Billing email']])).toEqual(['Workspace name']);
  });
});
