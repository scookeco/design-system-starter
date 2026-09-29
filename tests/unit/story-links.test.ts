import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findStoryLinkProblems, referencedIds, removedExampleProblems, storyIds, type SourceFile } from '../../scripts/checks/story-links';
import { REMOVED_EXAMPLES } from '../../docs/ui/removedExamples';

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
    expect(findStoryLinkProblems(docs, ids, REMOVED_EXAMPLES).map((p) => `${p.file}: ${p.problem}`)).toEqual([]);
  });

  it('lists only examples that are gone and still linked as removed (docs/ui/removedExamples.ts)', () => {
    expect(removedExampleProblems(REMOVED_EXAMPLES, ids, docs)).toEqual([]);
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

  it('silences only listed, deleted examples, and checks the list itself (negative controls)', () => {
    const present = new Set(['examples-list-page--default', 'components-button--docs']);
    const guide: SourceFile = {
      file: 'guide.tsx',
      code: [
        '<StoryLink id="examples-inbox--conversation-open">the inbox</StoryLink>',
        '<StoryLink id="examples-inbx--typo">a typo in a title</StoryLink>',
        '<StoryLink id="examples-list-page--missing">a typo under a present title</StoryLink>',
        '<StoryLink id="components-button--gone">a system page</StoryLink>',
      ].join('\n'),
    };
    // examples-inbox is listed as removed, so its link is text; the three others are still dead.
    expect(findStoryLinkProblems([guide], present, ['examples-inbox']).map((p) => p.problem.split(' (')[0])).toEqual([
      'no story or Docs tab has the id "examples-inbx--typo"',
      'no story or Docs tab has the id "examples-list-page--missing"',
      'no story or Docs tab has the id "components-button--gone"',
    ]);
    // The list: a system page, an example that still has stories, and an entry nothing links to all fail.
    expect(removedExampleProblems(['examples-inbox', 'components-button', 'examples-list-page', 'examples-inboxx'], present, [guide])).toEqual([
      'components-button: only golden examples (examples-…) can be listed as removed',
      'components-button: still has stories; delete them, or take it off the list',
      'examples-list-page: still has stories; delete them, or take it off the list',
      'examples-inboxx: nothing in docs/ links to it; is it misspelt, or no longer needed on the list?',
    ]);
  });
});
