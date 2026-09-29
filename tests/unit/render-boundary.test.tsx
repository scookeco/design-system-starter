// @vitest-environment jsdom
/**
 * The renderer error boundary: one broken renderer (here a real field registry entry that throws)
 * costs its page, never the shell; it's reported through the telemetry sink, and Try again renders
 * the page afresh.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { seedRecords } from '../../src/app/mocks/seed';
import { FIELD_REGISTRY } from '../../src/app/registries/fields';
import { RenderBoundary } from '../../src/app/routing/RenderBoundary';
import { ExampleApp } from '../../src/examples/App';
import { captureTelemetry, FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

setupMockApi();
const events = captureTelemetry();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// React logs every error a boundary catches; these are on purpose.
const quietReact = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

const record = seedRecords('acme').find((r) => r.id === 'r-1001') as RecordEntity;

describe('a page whose renderer throws', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('shows the error state in its place, inside a working shell, reports it, and recovers on Try again', async () => {
    quietReact();
    // The registry's money entry breaks, as a bad release might: the record page can't render its amount.
    const display = vi.spyOn(FIELD_REGISTRY.money, 'display').mockImplementation(() => {
      throw new Error(`Couldn’t render ${record.name}`);
    });
    const { history } = renderWithApp(<ExampleApp />, { url: `/records/${record.id}` });

    expect(await screen.findByRole('heading', { level: 1, name: 'This page couldn’t be shown' }, FIRST_PAINT)).toBeTruthy();
    // The shell is still there, and still works.
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    // Reported once per catch, under the route's pattern (not the URL with its id) and the error's class (not its message).
    const reports = events.filter((e) => e.kind === 'render');
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((e) => e.region === '/records/:id' && e.code === 'Error')).toBe(true);
    expect(JSON.stringify(events)).not.toContain(record.name);

    // Fixed (the next render works): Try again renders the page afresh.
    display.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: record.name }, FIRST_PAINT)).toBeTruthy();

    // A failure doesn't follow the person: another path starts with a fresh boundary.
    act(() => history.push('/records'));
    expect(await screen.findByRole('navigation', { name: 'Records pages' }, FIRST_PAINT)).toBeTruthy();
  });

  it('keeps failing honestly: a region that throws again shows the fallback again and reports again', () => {
    quietReact();
    let attempts = 0;
    function Broken(): never {
      attempts += 1;
      throw new TypeError('always');
    }
    render(
      <RenderBoundary region="widget" fallback={(retry) => <button onClick={retry}>Retry widget</button>}>
        <Broken />
      </RenderBoundary>,
    );
    const before = attempts;
    fireEvent.click(screen.getByRole('button', { name: 'Retry widget' }));
    expect(attempts).toBeGreaterThan(before);
    expect(screen.getByRole('button', { name: 'Retry widget' })).toBeTruthy();
    expect(events.filter((e) => e.kind === 'render')).toEqual([
      { kind: 'render', phase: 'failure', region: 'widget', code: 'TypeError' },
      { kind: 'render', phase: 'failure', region: 'widget', code: 'TypeError' },
    ]);
  });
});
