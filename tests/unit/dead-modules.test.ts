import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findDeadModules, findRoots, KEEP, pageEntries, report } from '../../scripts/dead-modules';

/**
 * The dead-module check (scripts/dead-modules.ts, in npm run check): after an example is deleted,
 * the modules only it used are named instead of lingering. A missed use is a false alarm the
 * developer must argue with, so these pin both directions: what it reports, and every way a module
 * can be used without a plain import (a barrel, a glob, ?raw, a lazy route, a type, a test).
 */

/**
 * Budget for the real-repo tests: each builds the whole repo's graph with TypeScript's parser
 * (about 730 modules with the tests and scripts). Quiet, that takes under half a second; with
 * Playwright running beside it, the similar CSS-scope test (affected-stories.test.ts) once took
 * over Vitest's 5 s default. Per test, never global.
 */
const REAL_GRAPH_TIMEOUT = 20_000;

const write = (root: string, files: Record<string, string>) => {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
};

describe('the dead-module check, on a fixture repo', () => {
  let root: string;
  let roots: string[];
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'dead-modules-'));
    write(root, {
      // The app entry, commented-out scripts ignored.
      'index.html': '<!-- <script type="module" src="/src/old.tsx"></script> -->\n<script type="module" src="/src/main.tsx"></script>\n',
      '.storybook/main.ts': "export default { stories: ['../src/**/*.stories.tsx'] };\n",
      'src/vite-env.d.ts': '/// <reference types="vite/client" />\n',
      // The library entry: every export is public, whether or not anything uses it.
      'src/index.ts': "export * from './components/Unused';\n",
      'src/components/Unused.tsx': "import './Unused.css';\nexport const Unused = () => null;\n",
      'src/components/Unused.css': '.unused {}\n',
      // The app: a barrel read by name, a lazy route, a glob, ?raw, a type-only import.
      'src/main.tsx':
        "import { used } from './app/barrel';\nimport type { Shape } from './app/types';\nimport css from './app/raw.css?raw';\nexport const routes = [() => import('./examples/LazyPage')];\nexport const x: Shape = { used, css };\n",
      'src/app/barrel.ts': "export { used } from './used';\nexport { unasked } from './unasked';\n",
      'src/app/used.ts': 'export const used = 1;\n',
      'src/app/unasked.ts': 'export const unasked = 1;\n',
      'src/app/types.ts': 'export interface Shape { used: number; css: string }\n',
      'src/app/raw.css': '.raw {}\n',
      'src/examples/LazyPage.tsx': "const pages = import.meta.glob('./globbed/*.tsx');\nexport default pages;\n",
      'src/examples/globbed/One.tsx': 'export const One = 1;\n',
      // A story and a test are roots, and so is what they import.
      'src/examples/Story.stories.tsx': "import { storyOnly } from './storyOnly';\nexport default { title: 'Story' };\nexport const S = storyOnly;\n",
      'src/examples/storyOnly.ts': 'export const storyOnly = 1;\n',
      'tests/unit/a.test.ts': "import { testOnly } from '../../src/app/testOnly';\nexport const t = testOnly;\n",
      'src/app/testOnly.ts': 'export const testOnly = 1;\n',
      // The orphans: what a deleted example leaves behind, and what only they import.
      'src/app/url/chatState.ts': "import { helper } from './chatHelper';\nexport const chat = helper;\n",
      'src/app/url/chatHelper.ts': 'export const helper = 1;\n',
      'src/app/orphan.css': '.orphan {}\n',
      'docs/guides/stray.ts': 'export const stray = 1;\n',
    });
    roots = await findRoots(root);
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds the entry points: the page scripts, the library entry, the stories and every code file outside src/ and docs/', () => {
    expect(pageEntries(root, 'index.html')).toEqual(['src/main.tsx']);
    expect(roots).toEqual(['.storybook/main.ts', 'src/examples/Story.stories.tsx', 'src/index.ts', 'src/main.tsx', 'tests/unit/a.test.ts']);
  });

  it('reports every module no entry point reaches, including what only an orphan imports', () => {
    expect(findDeadModules(roots, { root, keep: [] }).dead).toEqual(['docs/guides/stray.ts', 'src/app/orphan.css', 'src/app/unasked.ts', 'src/app/url/chatHelper.ts', 'src/app/url/chatState.ts']);
  });

  it('does not report a module reached only through a barrel by name, a glob, ?raw, a lazy route, a type, a story or a test', () => {
    const { dead } = findDeadModules(roots, { root, keep: [] });
    for (const file of ['src/app/used.ts', 'src/examples/globbed/One.tsx', 'src/app/raw.css', 'src/examples/LazyPage.tsx', 'src/app/types.ts', 'src/examples/storyOnly.ts', 'src/app/testOnly.ts']) {
      expect(dead, file).not.toContain(file);
    }
    // A public export nothing uses is still public; declaration files are loaded by tsconfig.
    expect(dead).not.toContain('src/components/Unused.tsx');
    expect(dead).not.toContain('src/components/Unused.css');
    expect(dead).not.toContain('src/vite-env.d.ts');
  });

  it('KEEP silences a listed module; an entry whose file is gone, or that something imports, fails', () => {
    const keep = [
      { file: 'docs/guides/stray.ts', reason: 'fixture' },
      { file: 'src/app/gone.ts', reason: 'fixture' },
      { file: 'src/app/used.ts', reason: 'fixture' },
    ];
    const result = findDeadModules(roots, { root, keep });
    expect(result.dead).not.toContain('docs/guides/stray.ts');
    expect(result.stale).toEqual(['src/app/gone.ts: listed in KEEP, but the file no longer exists; delete the entry', 'src/app/used.ts: listed in KEEP, but something imports it now; delete the entry']);
    expect(report({ ...result, dead: [] })).toMatch(/Stale KEEP entries[\s\S]*src\/app\/gone\.ts/);
  });

  it('the failure names each file and says what to do; nothing to report is null', () => {
    const message = report(findDeadModules(roots, { root, keep: [] })) ?? '';
    expect(message).toMatch(/^Dead modules: 5 files/);
    expect(message).toContain('  ✗ src/app/url/chatState.ts');
    expect(message).toMatch(/delete them/);
    expect(message).toMatch(/KEEP in scripts\/dead-modules\.ts/);
    expect(report(findDeadModules(roots, { root, keep: [], deleted: new Set(['src/app/url/chatState.ts', 'src/app/url/chatHelper.ts', 'src/app/orphan.css', 'src/app/unasked.ts', 'docs/guides/stray.ts']) }))).toBeNull();
  });

  it('a deleted page takes what only it used with it (negative control: the same module, still imported, is fine)', () => {
    write(root, { 'src/examples/Chat.tsx': "import { chat } from '../app/url/chatState';\nexport default chat;\n" });
    const withChat = [...roots, 'src/examples/Chat.tsx'];
    expect(findDeadModules(withChat, { root, keep: [] }).dead).not.toContain('src/app/url/chatState.ts');
    expect(findDeadModules(withChat, { root, keep: [], deleted: new Set(['src/examples/Chat.tsx']) }).dead).toContain('src/app/url/chatState.ts');
  });
});

describe('the dead-module check, on this repo', () => {
  let roots: string[];
  beforeAll(async () => {
    roots = await findRoots();
  }, REAL_GRAPH_TIMEOUT);

  it(
    'every module under src/ and docs/ is reached, and KEEP is empty',
    () => {
      const result = findDeadModules(roots);
      expect(result.checked).toBeGreaterThan(500);
      expect(result.dead).toEqual([]);
      expect(result.stale).toEqual([]);
      expect(KEEP).toEqual([]);
      expect(roots).toEqual(expect.arrayContaining(['src/main.tsx', 'src/index.ts', 'src/examples/ListPage.stories.tsx', 'tests/unit/dead-modules.test.ts', '.storybook/preview.tsx', 'vite.app.config.ts']));
    },
    REAL_GRAPH_TIMEOUT,
  );

  it(
    'trimming the AI examples as the README says leaves src/app/url/chatState.ts, and only that (the rehearsal, kept)',
    () => {
      const ai = ['RecordCopilot', 'CreateWithAi', 'AiReviewChanges', 'AssistantChatPage'].flatMap((name) => [`src/examples/${name}.tsx`, `src/examples/${name}.stories.tsx`]);
      const deleted = new Set([...ai, 'src/examples/AssistantTurns.tsx', 'tests/unit/ai-examples.test.tsx']);
      expect(findDeadModules(roots, { deleted }).dead).toEqual(['src/app/url/chatState.ts']);
      expect(findDeadModules(roots, { deleted: new Set([...deleted, 'src/app/url/chatState.ts']) }).dead).toEqual([]);
    },
    REAL_GRAPH_TIMEOUT,
  );
});
