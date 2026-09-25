/**
 * Story links: every reference to a gallery story or Docs tab from docs/ must name a story id that
 * exists, so a renamed story or export can't leave a dead link behind (tests/unit/story-links.test.ts).
 *
 * Story ids are computed the way Storybook computes them, by parsing each CSF file with Storybook's
 * own csf-tools (title + export name → id), so the check needs no built gallery.
 */
import { loadCsf } from 'storybook/internal/csf-tools';

export interface SourceFile {
  file: string;
  code: string;
}

/** Every story id and Docs tab id ("<title-id>--docs") declared by the given CSF files. */
export const storyIds = (storyFiles: readonly SourceFile[]): Set<string> => {
  const ids = new Set<string>();
  for (const { file, code } of storyFiles) {
    const csf = loadCsf(code, { fileName: file, makeTitle: (title: string) => title }).parse();
    for (const story of csf.stories) {
      ids.add(story.id);
      ids.add(`${story.id.split('--')[0] ?? ''}--docs`);
    }
  }
  return ids;
};

/** A story id: kebab-case title, "--", kebab-case story. */
const ID = '[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*';

/** Forms a story reference takes in docs/ source. */
const REFERENCES: RegExp[] = [
  // <StoryLink id="guides-forms--forms-guide">
  new RegExp(`\\bid="(${ID})"`, 'g'),
  // { name: 'Stack', id: 'primitives-stack--default', … } rows rendered as <StoryLink id={row.id}>
  new RegExp(`\\bid:\\s*'(${ID})'`, 'g'),
  // ./?path=/story/<id> or /docs/<id> written out by hand
  new RegExp(`path=/(?:story|docs)/(${ID})`, 'g'),
];

/** Story ids referenced in one file. */
export const referencedIds = (code: string): string[] => [...new Set(REFERENCES.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1] ?? '')))];

export interface StoryLinkProblem {
  file: string;
  problem: string;
}

/**
 * Dead references, plus StoryLinks whose id is an expression in a file that holds no literal story
 * ids: those can't be checked, so they fail too (keep the ids as `id: '…'` literals in the file).
 */
export const findStoryLinkProblems = (files: readonly SourceFile[], ids: ReadonlySet<string>): StoryLinkProblem[] =>
  files.flatMap(({ file, code }) => {
    const referenced = referencedIds(code);
    const dead = referenced.filter((id) => !ids.has(id)).map((id) => ({ file, problem: `no story or Docs tab has the id "${id}"` }));
    const unverifiable = /<StoryLink\s+id=\{/.test(code) && referenced.length === 0 ? [{ file, problem: 'StoryLink id is an expression, and the file has no literal story ids to check' }] : [];
    return [...dead, ...unverifiable];
  });
