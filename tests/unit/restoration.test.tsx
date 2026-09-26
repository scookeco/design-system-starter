// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../../src/app/url/history';
import { ExampleApp } from '../../src/examples/App';
import { renderWithApp, setupMockApi } from './app-harness';

const scrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
afterEach(() => {
  cleanup();
  if (scrollTop) Object.defineProperty(Element.prototype, 'scrollTop', scrollTop);
});
setupMockApi();

/** The first row link on the list's second page. */
const secondRow = async () => (await screen.findAllByRole('link', { name: /agreement|lease|retainer|addendum|order|renewal|contract|schedule/ })).find((link) => link.getAttribute('href')?.startsWith('/records/r-')) as HTMLAnchorElement;

describe('history: push to open, Back restores', () => {
  it('records how each entry was reached', () => {
    const history = createMemoryHistory('/records');
    expect(history.action?.()).toBe('initial');
    history.push('/records/r-1001');
    expect(history.action?.()).toBe('push');
    history.replace('/records/r-1001/activity');
    expect(history.action?.()).toBe('replace');
    history.back();
    expect(history.action?.()).toBe('pop');
  });

  it('Back from a record puts focus on the row that was opened, and the scroll where it was', async () => {
    const { history } = renderWithApp(<ExampleApp />, { url: '/records?page=2' });
    await screen.findByRole('navigation', { name: 'Records pages' }, { timeout: 5000 });
    const link = await secondRow();
    const href = link.getAttribute('href');
    // jsdom doesn't lay out or scroll: keep each <main>'s scrollTop so the test can see it set.
    const tops = new WeakMap<Element, number>();
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get(this: Element) {
        return tops.get(this) ?? 0;
      },
      set(this: Element, value: number) {
        if (this.tagName === 'MAIN') tops.set(this, value);
      },
    });
    // The page's scroll container (AppShell's main) was scrolled down to this row.
    (document.querySelector('main') as HTMLElement).scrollTop = 240;
    const name = link.textContent ?? '';
    fireEvent.click(link);
    expect(history.location().pathname).toBe(href);
    await screen.findByRole('heading', { level: 1, name }, { timeout: 5000 });

    act(() => history.back());
    await waitFor(() => expect(document.activeElement?.getAttribute('href')).toBe(href), { timeout: 5000 });
    expect(history.location().search).toBe('?page=2');
    // A new page, a new <main>: scrolled back to where the list was.
    expect((document.querySelector('main') as HTMLElement).scrollTop).toBe(240);
  });

  it('a fresh visit (a push) starts at the top, with no focus restored', async () => {
    const { history } = renderWithApp(<ExampleApp />, { url: '/records' });
    await screen.findByRole('navigation', { name: 'Records pages' }, { timeout: 5000 });
    const link = await secondRow();
    const name = link.textContent ?? '';
    fireEvent.click(link);
    await screen.findByRole('heading', { level: 1, name }, { timeout: 5000 });
    act(() => history.push('/records'));
    await screen.findByRole('navigation', { name: 'Records pages' }, { timeout: 5000 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement?.getAttribute('href') ?? '').not.toMatch(/^\/records\/r-/);
  });
});
