import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findStoryLinkProblems, referencedIds, storyIds, type SourceFile } from '../../scripts/checks/story-links';

const root = resolve(import.meta.dirname, '../..');

const walk = (dir: string, keep: (file: string) => boolean): SourceFile[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, keep);
    return keep(entry) ? [{ file: relative(root, full), code: readFileSync(full, 'utf8') }] : [];
  });

// The same globs as .storybook/main.ts.
const isStory = (f: string) => /\.stories\.tsx?$/.test(f);
const stories = [...walk(join(root, 'docs'), isStory), ...walk(join(root, 'src'), isStory), ...walk(join(root, 'tests/visual/fixtures'), isStory)];
const ids = storyIds(stories);
const docs = walk(join(root, 'docs'), (f) => /\.tsx?$/.test(f));

describe('story links in docs/', () => {
  it('every StoryLink and story id in docs/ names a story or Docs tab that exists', () => {
    expect(findStoryLinkProblems(docs, ids).map((p) => `${p.file}: ${p.problem}`)).toEqual([]);
  });

  it('finds the links it checks (positive control)', () => {
    expect(docs.reduce((n, f) => n + referencedIds(f.code).length, 0)).toBeGreaterThan(30);
    expect(ids.has('guides-forms--forms-guide')).toBe(true);
    expect(ids.has('components-button--docs')).toBe(true);
  });

  it('reports a dead id and an unverifiable link (negative controls)', () => {
    const bad: SourceFile[] = [
      { file: 'dead.tsx', code: '<StoryLink id="guides-forms--forms">Forms</StoryLink>' },
      { file: 'row.tsx', code: "const ROWS = [{ name: 'X', id: 'primitives-stack--nope' }];" },
      { file: 'href.tsx', code: '<a href="./?path=/story/components-button--missing">x</a>' },
      { file: 'expr.tsx', code: 'const id = make(); <StoryLink id={id}>x</StoryLink>' },
      { file: 'ok.tsx', code: '<StoryLink id="guides-forms--forms-guide">Forms</StoryLink>' },
    ];
    expect(findStoryLinkProblems(bad, ids).map((p) => p.file)).toEqual(['dead.tsx', 'row.tsx', 'href.tsx', 'expr.tsx']);
  });
});
