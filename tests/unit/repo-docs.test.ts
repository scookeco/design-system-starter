/**
 * The repo's own Markdown names only things that exist. README.md and CLAUDE.md point people and
 * agents at files (`src/examples/ListPage.tsx`), and CLAUDE.md's rules block (which becomes llms.txt
 * and the manifest) tells agents which example to copy for each archetype. After a file or an example
 * is deleted, these fail and name the line to change, instead of leaving directions to nowhere.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractAgentRules } from '../../scripts/checks/agent-rules';

const root = resolve(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

/** Top-level folders a repo path starts with. A path with a glob or a placeholder (`*`, `<Name>`, `{…}`) is a pattern, not a file. */
const REPO_PATH = /^(?:src|docs|tests|scripts|tokens|fixtures|\.storybook|\.github)\/[\w./-]*$/;

/** Every `code span` in a Markdown file that is a concrete repo path. */
const repoPaths = (markdown: string): string[] => [...new Set([...markdown.matchAll(/`([^`\n]+)`/g)].map((m) => m[1] ?? '').filter((p) => REPO_PATH.test(p)))];

/** The examples the rules block sends agents to: "list → ListPage, record → RecordPage, …". */
const copyTargets = (rules: string): string[] => {
  const map = /Copy the matching golden example:([\s\S]*?)Not other screens\./.exec(rules)?.[1] ?? '';
  return [...map.matchAll(/→\s*(\w+)/g)].map((m) => m[1] ?? '');
};

describe('README.md and CLAUDE.md', () => {
  it.each(['README.md', 'CLAUDE.md'])('%s: every repo path it names exists', (file) => {
    const paths = repoPaths(read(file));
    expect(paths.length).toBeGreaterThan(10);
    expect(paths.filter((p) => !existsSync(resolve(root, p)))).toEqual([]);
  });

  it('CLAUDE.md rules: every example agents are told to copy exists in src/examples', () => {
    const targets = copyTargets(extractAgentRules(read('CLAUDE.md')));
    expect(targets.length).toBeGreaterThan(3);
    expect(targets.filter((name) => !existsSync(resolve(root, 'src/examples', `${name}.tsx`)))).toEqual([]);
  });

  it('finds paths and targets, and reports missing ones (controls)', () => {
    expect(repoPaths('Copy `src/examples/Gone.tsx`, not `src/examples/*` or `docs/usage/<Name>.usage.tsx`; run `npm test`.')).toEqual(['src/examples/Gone.tsx']);
    expect(copyTargets('- Copy the matching golden example: list → ListPage,\n  wizard → GoneWizard. Not other screens.')).toEqual(['ListPage', 'GoneWizard']);
  });
});
