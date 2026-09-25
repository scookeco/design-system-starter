// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateEditFlow } from '../../src/examples/CreateEditFlow';
import { SettingsPage } from '../../src/examples/SettingsPage';
import { SignInPage } from '../../src/examples/SignInPage';
import { SetupWizard } from '../../src/examples/SetupWizard';
import { ListPage } from '../../src/examples/ListPage';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

// jsdom has no ResizeObserver; Radix measures its hidden form inputs with one inside a <form>.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Create and edit example', () => {
  it('on a failed submit focuses an error summary whose links move focus to each invalid field', () => {
    render(<CreateEditFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));

    const summary = screen.getByText('There are 4 problems with this record').closest('[tabindex="-1"]');
    expect(document.activeElement).toBe(summary);
    // Focus announces it, so it is a named region rather than an alert that would say it twice.
    expect(summary).toBe(screen.getByRole('region', { name: 'There are 4 problems with this record' }));
    expect(screen.queryByRole('alert')).toBeNull();

    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name.getAttribute('aria-invalid')).toBe('true');
    fireEvent.click(screen.getByRole('link', { name: 'Enter a name for the record.' }));
    expect(document.activeElement).toBe(name);

    fireEvent.click(screen.getByRole('link', { name: 'Choose what happens when the term ends.' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Renews automatically' }));
  });

  it('clears a field error as soon as it is fixed, keeping what was typed', () => {
    render(<CreateEditFlow initialSubmitted />);
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Hardware lease' } });
    expect(name.getAttribute('aria-invalid')).toBeNull();
    expect((name as HTMLInputElement).value).toBe('Hardware lease');
    expect(screen.getByText('There are 3 problems with this record')).toBeTruthy();
  });
});

describe('Settings example', () => {
  it('keeps the tiers apart in a labelled sub-nav and switches category through it', () => {
    render(<SettingsPage />);
    const subNav = screen.getByRole('navigation', { name: 'Settings' });
    expect(within(subNav).getByRole('list', { name: 'Personal' })).toBeTruthy();
    expect(within(subNav).getByRole('list', { name: 'Workspace' })).toBeTruthy();
    expect(within(subNav).getByRole('link', { name: 'Notifications' }).getAttribute('aria-current')).toBe('page');

    fireEvent.click(within(subNav).getByRole('link', { name: 'General' }));
    expect(screen.getByRole('heading', { level: 2, name: 'General' })).toBeTruthy();
    expect(within(subNav).getByRole('link', { name: 'General' }).getAttribute('aria-current')).toBe('page');
  });

  it('announces a successful save in a status banner', () => {
    render(<SettingsPage initialSaved />);
    expect(screen.getByRole('status').textContent).toContain('Notification preferences saved.');
  });
});

describe('Sign-in example', () => {
  it('announces a failed sign-in as an alert and validates the verification code', () => {
    render(<SignInPage initialStep="password" initialError="That email and password don’t match." />);
    expect(screen.getByRole('alert').textContent).toContain('don’t match');
    cleanup();

    render(<SignInPage initialStep="verify" />);
    const code = screen.getByRole('textbox', { name: '6-digit code' });
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    fireEvent.change(code, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(code.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(code.getAttribute('aria-invalid')).toBeNull();
  });

  it('checks the email before sending a sign-in link', () => {
    render(<SignInPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(screen.getByRole('textbox', { name: 'Work email' }).getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(screen.getByRole('textbox', { name: 'Work email' }), { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toBeTruthy();
  });
});

describe('Setup wizard example', () => {
  it('validates only the current step, focuses the first invalid field, then moves focus to the next step’s h1', async () => {
    render(<SetupWizard />);
    const current = () => document.querySelector('[aria-current="step"] .stepper__label')?.textContent;
    expect(current()).toBe('Workspace');
    expect(screen.getByRole('progressbar', { name: 'Setup progress' }).getAttribute('aria-valuetext')).toBe('Step 1 of 4');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const name = screen.getByRole('textbox', { name: 'Workspace name' });
    expect(name.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(name));

    fireEvent.change(name, { target: { value: 'Acme Legal' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace address' }), { target: { value: 'acme-legal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(current()).toBe('Invite');
    expect(screen.getByText('Completed:', { exact: false }).closest('li')?.textContent).toContain('Workspace');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Invite your team' }));
  });
});

describe('List page example', () => {
  it('shows active filters as chips; removing one moves focus to the next chip, then to Filters', async () => {
    renderWithApp(<ListPage initialStatuses={['active', 'pending']} />);
    const chips = screen.getByRole('list', { name: 'Active filters' });
    fireEvent.click(within(chips).getByRole('button', { name: 'Remove filter: status Active' }));
    await waitFor(() => expect(document.activeElement).toBe(within(chips).getByRole('button', { name: 'Remove filter: status Pending' })));
    fireEvent.click(within(chips).getByRole('button', { name: 'Remove filter: status Pending' }));
    expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filters' })));
  });

  it('pages on the server: the summary shows the server’s total and the current page', async () => {
    renderWithApp(<ListPage />);
    const pager = await screen.findByRole('navigation', { name: 'Records pages' });
    expect(within(pager).getByRole('status').textContent).toBe('1–10 of 219');
    expect(within(pager).getByRole('button', { name: 'Page 1' }).getAttribute('aria-current')).toBe('page');
    expect(within(pager).getByRole('button', { name: 'Previous' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(within(pager).getByRole('status').textContent).toBe('11–20 of 219'));
    expect(within(pager).getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('counts each view on the server and shows the counts in the tabs', async () => {
    renderWithApp(<ListPage />);
    const views = screen.getByRole('navigation', { name: 'Record views' });
    await waitFor(() => expect(within(views).getByRole('link', { name: 'All (219)' }).getAttribute('aria-current')).toBe('page'));
    expect(within(views).getByRole('link', { name: 'Archived (21)' })).toBeTruthy();
  });

  it('clears the search from its clear button and keeps focus in the field', () => {
    renderWithApp(<ListPage initialQuery="lease" />);
    const search = screen.getByRole('searchbox', { name: 'Search records' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect((search as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(search);
  });
});
