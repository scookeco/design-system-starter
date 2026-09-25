// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { componentExports, findUndocumentedExports } from '../../scripts/checks/docs-coverage';
import * as api from '../../src/index';
import { usageDocs } from '../../docs/usage/registry';

afterEach(cleanup);

const root = resolve(import.meta.dirname, '../..');
const docs = [...usageDocs];

const storyFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? storyFiles(full) : entry.endsWith('.stories.tsx') ? [full] : [];
  });
const storyTitles = storyFiles(join(root, 'src')).flatMap((file) => {
  const title = /title: '([^']+)'/.exec(readFileSync(file, 'utf8'))?.[1];
  return title ? [title] : [];
});

describe('usage docs', () => {
  it('cover every component, layout and primitive exported from src/index.ts', () => {
    const undocumented = findUndocumentedExports(api, docs.flatMap(([, usage]) => usage.covers));
    expect(undocumented, 'Add docs/usage/<Name>.usage.tsx (or list the part in its parent doc’s covers)').toEqual([]);
  });

  it('only cover public exports', () => {
    const exported = new Set<unknown>(Object.values(api));
    const stray = docs.flatMap(([name, usage]) => usage.covers.filter((c) => !exported.has(c)).map(() => name));
    expect(stray).toEqual([]);
  });

  it.each(docs)('%s is attached to a story title, so it shows on a Docs tab', (name) => {
    expect(storyTitles.some((title) => title.split('/').at(-1) === name)).toBe(true);
  });

  it.each(docs)('%s has every section filled in', (_name, usage) => {
    expect(usage.covers.length).toBeGreaterThan(0);
    expect(usage.whenToUse.length).toBeGreaterThan(0);
    expect(usage.whenNotToUse.length).toBeGreaterThan(0);
    expect(usage.accessibility.length).toBeGreaterThan(0);
    for (const example of [usage.do, usage.dont]) expect(example.caption.trim()).not.toBe('');
  });

  it.each(docs)('%s do and don’t examples render', (_name, usage) => {
    for (const example of [usage.do, usage.dont]) {
      const { container } = render(<>{example.render()}</>);
      expect(container.childElementCount).toBeGreaterThan(0);
      cleanup();
    }
  });
});

describe('docs coverage check (negative controls)', () => {
  const Documented = () => null;
  const Orphan = () => null;

  it('reports a PascalCase export no doc covers', () => {
    expect(findUndocumentedExports({ Documented, Orphan, useThing: () => null, vars: {} }, [Documented])).toEqual(['Orphan']);
  });

  it('matches by identity, not by name', () => {
    const Impostor = () => null;
    expect(findUndocumentedExports({ Documented }, [Impostor])).toEqual(['Documented']);
  });

  it('counts object exports (forwardRef, memo) as components', () => {
    expect(componentExports({ Wrapped: { $$typeof: Symbol.for('react.forward_ref') } }).map(([n]) => n)).toEqual(['Wrapped']);
  });
});
