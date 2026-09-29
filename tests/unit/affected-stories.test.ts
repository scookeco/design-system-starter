import { globSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  affectedEntries,
  classify,
  cssScopeProblems,
  loadGallery,
  ModuleGraph,
  ROOT,
  storyFiles,
  statsProblems,
  storyGlobs,
  type Gallery,
  type IndexEntry,
} from '../../scripts/affected-stories';

/**
 * npm run test:visual:changed picks the stories a change can affect (scripts/affected-stories.ts).
 * A missed story is worse than a slow run, so these pin both directions: what a change must reach,
 * and what it must leave alone. The CI check job has no built Storybook, so the index entries here
 * are written out; `npm run test:visual:changed -- --self-check` compares the graph with the built one.
 */

/**
 * Budget for building the real repo's graph: parsing every module the gallery reaches (about 600) with
 * TypeScript, then walking it. Quiet, that takes well under a second; with Playwright running beside
 * it, the CSS-scope test once timed out at Vitest's 5 s default. Given per test (and per hook that
 * builds the graph), never globally: the fixture tests here stay on the default.
 */
const REAL_GRAPH_TIMEOUT = 20_000;

const write = (root: string, files: Record<string, string>) => {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
};

describe('the module graph', () => {
  let root: string;
  let graph: ModuleGraph;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'affected-'));
    write(root, {
      'index.ts': "import './global.css';\nexport * from './a';\nexport { B as Bee } from './b';\nexport type { T } from './t';\n",
      'global.css': '@import url("./base.css");\n',
      'base.css': '',
      'a.ts': "import './a.css';\nexport const A = 1;\n",
      'a.css': '',
      'b.ts': "import { A } from './a';\nexport const B = A;\n",
      't.ts': 'export type T = number;\n',
      'by-name.tsx': "import { Bee } from './index';\nexport const x = Bee;\n",
      'namespace.tsx': "import * as all from './index';\nexport const x = all;\n",
      'types.tsx': "import type { T } from './t';\nimport { type T as U } from './a';\nexport const x: T | U = 1;\n",
      'lazy.tsx': "export const load = () => import('./b');\n",
      'glob.tsx': "import doc from './doc.md?raw';\nconst pages = import.meta.glob(['./pages/*.ts', '!./pages/skip.ts'], { eager: true });\nexport { doc, pages };\n",
      'doc.md': '# doc',
      'pages/one.ts': 'export const one = 1;\n',
      'pages/skip.ts': 'export const skip = 1;\n',
      'broken.ts': "import './missing';\nconst name = 'x';\nexport const load = () => import(name);\n",
    });
    graph = new ModuleGraph(root);
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const closure = (file: string) => [...graph.closure(file)].sort();

  it('follows a barrel by name: only the module that exports the name, plus the barrel’s own side effects', () => {
    expect(closure('by-name.tsx')).toEqual(['a.css', 'a.ts', 'b.ts', 'base.css', 'by-name.tsx', 'global.css', 'index.ts']);
    // b imports A, so a comes in through b. Asking for something a barrel doesn't route falls back to all of it.
    expect(closure('namespace.tsx')).toEqual(['a.css', 'a.ts', 'b.ts', 'base.css', 'global.css', 'index.ts', 'namespace.tsx']);
  });

  it('skips type-only imports but keeps the bare import an inline `type` leaves behind', () => {
    expect(closure('types.tsx')).toEqual(['a.css', 'a.ts', 'types.tsx']);
  });

  it('follows import(), import.meta.glob (with negation), ?raw and CSS @import', () => {
    expect(closure('lazy.tsx')).toEqual(['a.css', 'a.ts', 'b.ts', 'lazy.tsx']);
    expect(closure('glob.tsx')).toEqual(['doc.md', 'glob.tsx', 'pages/one.ts']);
  });

  it('follows type-only imports, re-exports and `typeof import()` only when asked (the dead-module check asks)', () => {
    write(root, {
      'typed.tsx': "import type { T } from './t';\nexport type U = T | typeof import('./pages/one');\nexport type { A } from './a';\n",
    });
    const typed = new ModuleGraph(root, { types: true });
    expect([...typed.closure('typed.tsx')].sort()).toEqual(['a.css', 'a.ts', 'pages/one.ts', 't.ts', 'typed.tsx']);
    expect(closure('typed.tsx')).toEqual(['typed.tsx']);
    // A barrel is still a barrel when it re-exports types: names are routed, not the whole of it.
    expect([...typed.closure('by-name.tsx')].sort()).toEqual(['a.css', 'a.ts', 'b.ts', 'base.css', 'by-name.tsx', 'global.css', 'index.ts']);
  });

  it('records what it cannot resolve instead of dropping it', () => {
    graph.closure('broken.ts');
    expect(graph.info('broken.ts').problems).toEqual(['broken.ts: cannot resolve "./missing"', 'broken.ts: import() of a computed specifier']);
  });
});

describe('the gallery: which stories a change reaches', () => {
  let gallery: Gallery;
  beforeAll(async () => {
    gallery = loadGallery(storyFiles(await storyGlobs()));
  }, REAL_GRAPH_TIMEOUT);

  // Index entries as storybook-static/index.json lists them (ids are only labels here).
  const entry = (id: string, type: IndexEntry['type'], title: string, importPath: string): IndexEntry => ({ id, type, title, name: id, importPath: `./${importPath}` });
  const ENTRIES: IndexEntry[] = [
    entry('badge', 'story', 'Components/Badge', 'src/components/Badge/Badge.stories.tsx'),
    entry('badge-docs', 'docs', 'Components/Badge', 'src/components/Badge/Badge.stories.tsx'),
    entry('slider', 'story', 'Components/Slider', 'src/components/Slider/Slider.stories.tsx'),
    entry('slider-docs', 'docs', 'Components/Slider', 'src/components/Slider/Slider.stories.tsx'),
    entry('review-changes', 'story', 'Components/ReviewChanges', 'src/components/ReviewChanges/ReviewChanges.stories.tsx'),
    entry('list-page', 'story', 'Examples/List page', 'src/examples/ListPage.stories.tsx'),
    entry('record-page', 'story', 'Examples/Record page', 'src/examples/RecordPage.stories.tsx'),
    entry('colour', 'story', 'Foundations/Colour', 'docs/foundations/Colour.stories.tsx'),
    entry('testing', 'story', 'Guides/Testing', 'docs/guides/Testing.stories.tsx'),
    entry('agents', 'story', 'Guides/Agents', 'docs/guides/Agents.stories.tsx'),
  ];

  const run = (changed: string[], deleted: string[] = []) => {
    const sorted = classify(gallery, changed, new Set(deleted));
    return { sorted, ids: sorted.everything ? 'everything' : affectedEntries(gallery, sorted.graphed, ENTRIES, sorted.baselines).entries.map((e) => e.id).sort() };
  };

  it('resolves every import in the gallery', () => {
    expect(gallery.graph.parsed().flatMap((m) => m.problems)).toEqual([]);
    expect(gallery.stories.length).toBeGreaterThan(100);
  });

  it('a component change reaches its stories, its Docs tab and what composes it, not unrelated components', () => {
    const { ids } = run(['src/components/Badge/Badge.tsx']);
    expect(ids).toContain('badge');
    expect(ids).toContain('badge-docs');
    expect(ids).toContain('review-changes'); // ReviewChanges renders Badge
    expect(ids).toContain('list-page'); // the example shell's header shows badges
    expect(ids).not.toContain('slider');
    expect(ids).not.toContain('testing');
  });

  it('a stylesheet change reaches the same stories, and Foundations/Breakpoints, which globs every component stylesheet', () => {
    const { ids } = run(['src/components/Badge/Badge.css']);
    expect(ids).toEqual(expect.arrayContaining(['badge', 'badge-docs', 'review-changes', 'list-page']));
    expect(ids).not.toContain('slider');
    const files = affectedEntries(gallery, ['src/components/Badge/Badge.css'], []).files;
    expect(files.has('docs/foundations/BreakpointsLayoutGrid.stories.tsx')).toBe(true);
  });

  it('every Docs tab renders the usage section, which renders Badge: all Docs tabs, no other stories', () => {
    const { ids } = run(['src/components/Badge/Badge.tsx']);
    expect(ids).toContain('slider-docs');
  });

  it('a usage doc reaches only its own Docs tab', () => {
    expect(run(['docs/usage/Slider.usage.tsx']).ids).toEqual(['slider-docs']);
  });

  it('an app-layer module reaches the examples that use it, and no component', () => {
    const { ids } = run(['src/app/model/refetch.ts']);
    expect(ids).toEqual(['list-page', 'record-page']);
  });

  it('a guide change reaches only that guide; CLAUDE.md only Guides/Agents, which renders its rules block', () => {
    expect(run(['docs/guides/Testing.stories.tsx']).ids).toEqual(['testing']);
    expect(run(['CLAUDE.md']).ids).toEqual(['agents']);
  });

  it('the checks Foundations imports reach Foundations', () => {
    expect(run(['scripts/checks/contrast-pairs.ts']).ids).toEqual(['colour']);
  });

  it('tokens, global styles and whatever preview.tsx or the specs load run everything, with the reason', () => {
    for (const file of ['tokens/semantic/color.json', 'src/styles/base.css', '.storybook/preview.tsx', 'playwright.config.ts', 'package-lock.json']) {
      expect(run([file]).ids, file).toBe('everything');
    }
    // Derived, not listed: preview.tsx wraps every story in LocaleProvider; the specs freeze the clock at the seed's epoch.
    expect(run(['src/format/format.ts']).sorted.everything?.reason).toMatch(/preview\.tsx/);
    expect(run(['src/app/mocks/seed.ts']).sorted.everything?.reason).toMatch(/tests\/visual\/storybook\.ts/);
    expect(run(['tokens/semantic/color.json']).sorted.everything?.reason).toMatch(/tokens/);
  });

  it('unit tests, lint fixtures, other scripts and docs outside the gallery reach nothing', () => {
    const { sorted, ids } = run(['tests/unit/affected-stories.test.ts', 'fixtures/violations/css/raw-hex.css', 'scripts/manifest.ts', 'README.md', 'llms.txt']);
    expect(ids).toEqual([]);
    expect(sorted.ignored).toHaveLength(5);
  });

  it('the app entry reaches nothing: its page, build config, worker and source are outside the gallery', () => {
    const { sorted, ids } = run(['index.html', 'vite.app.config.ts', 'public/mockServiceWorker.js', 'src/main.tsx', 'src/bootstrap.tsx', 'src/app/mocks/browser.ts']);
    expect(ids).toEqual([]);
    expect(sorted.everything).toBeUndefined();
  });

  it('a file nothing imports and nothing classifies runs everything; gallery source nothing imports yet runs nothing', () => {
    expect(run(['some-new.config.ts']).sorted.everything?.reason).toMatch(/unclassified/);
    expect(run(['src/components/NotWiredYet/NotWiredYet.tsx']).ids).toEqual([]);
  });

  it('the self-check reports an import the bundler saw and the graph missed (negative control)', () => {
    const module = (id: string, ...importers: string[]) => ({ id, reasons: importers.map((moduleName) => ({ moduleName })) });
    const stats = {
      modules: [
        module('./src/components/Badge/Badge.css', './src/components/Badge/Badge.tsx', './docs/foundations/BreakpointsLayoutGrid.stories.tsx'),
        module('./CLAUDE.md?raw', './docs/guides/Agents.stories.tsx'),
        module('./node_modules/react/index.js', './src/components/Badge/Badge.tsx'),
        module('./src/components/Badge/Badge.tsx', './src/components/Slider/Slider.tsx'),
      ],
    };
    expect(statsProblems(gallery, stats).problems).toEqual(['src/components/Slider/Slider.tsx → src/components/Badge/Badge.tsx: an import the bundler saw and the graph missed']);
  });

  it('a committed baseline maps to its story; a deleted usage doc reaches every Docs tab through the glob that listed it', () => {
    expect(run(['tests/visual/__screenshots__/linux/list-page--dark.png']).ids).toEqual(['list-page']);
    expect(run(['docs/usage/Gone.usage.tsx'], ['docs/usage/Gone.usage.tsx']).ids).toEqual(['badge-docs', 'slider-docs']);
  });
});

describe('CSS scope (what lets barrels be followed by name)', () => {
  it('every system stylesheet styles only its own blocks, and whoever renders a block imports its stylesheet', async () => {
    const gallery = loadGallery(storyFiles(await storyGlobs()));
    const sheets = globSync('src/**/*.css', { cwd: ROOT })
      .map((f) => f.split(sep).join('/'))
      .filter((f) => !f.startsWith('src/styles/'));
    expect(sheets.length).toBeGreaterThan(50);
    expect(cssScopeProblems(gallery.graph, sheets, [...gallery.reachable])).toEqual([]);
  }, REAL_GRAPH_TIMEOUT);

  it('reports a foreign selector, a shared block, a shared or borrowed keyframes name and a class rendered without its stylesheet (negative controls)', () => {
    const root = mkdtempSync(join(tmpdir(), 'affected-css-'));
    try {
      write(root, {
        'X/X.css': '@layer components {\n  .x { color: red; animation-name: x-spin; }\n  .x__part:hover { color: blue; }\n  @keyframes x-spin { to { rotate: 1turn; } }\n}\n',
        'Y/Y.css': '.y { color: red; animation-name: spin; }\n.x__part { color: green; }\n.z .y__icon { color: red; }\n@keyframes x-spin { to { rotate: 1turn; } }\n',
        'X/X.tsx': "import './X.css';\nexport const X = () => <div className={cx('x', 'x__part')} />;\n",
        'Z.tsx': "export const Z = () => <div className=\"y\" data-variant={v === 'x' ? 1 : 0} />;\n",
      });
      const graph = new ModuleGraph(root);
      expect(cssScopeProblems(graph, ['X/X.css', 'Y/Y.css'], ['X/X.tsx', 'Z.tsx'])).toEqual([
        'Y/Y.css: block "x" is already styled at the top level by X/X.css',
        'Y/Y.css: "x-spin" is also defined by X/X.css',
        'Y/Y.css: uses "spin", which it doesn\'t define',
        'Y/Y.css: ".x__part" names no block this stylesheet owns',
        'Z.tsx: renders "y" but never imports Y/Y.css',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
