/**
 * Dead-module check (`npm run dead-modules`, inside `npm run check`): every module under src/ and
 * docs/ must be reachable from an entry point. Trimming the starter (README, "Start a new portal")
 * deletes examples; the app-layer modules only they used (src/app/url/chatState.ts behind the
 * assistant chat, say) compile, lint and pass on their own, so nothing else reports them.
 *
 * It reuses the import graph of `npm run test:visual:changed` (scripts/affected-stories.ts):
 * TypeScript's module resolution, static and literal dynamic imports (the lazy routes),
 * `import.meta.glob`, `?raw`, CSS `@import`, and barrels followed by name. Here it also follows
 * type-only imports: a module only types import is still in use.
 *
 * Entry points (roots):
 * - the app: every `<script src>` in index.html (src/main.tsx);
 * - the library: src/index.ts, read whole. Every system export is public API, used or not;
 * - every story file (.storybook/main.ts's globs);
 * - every code file outside src/ and docs/: tests (unit and visual), Storybook config, scripts,
 *   lint fixtures and the root config files. Only src/ and docs/ are checked, so these count
 *   as roots whether or not anything imports them.
 *
 * Checked: `.ts`, `.tsx` and `.css` under src/ and docs/, except declaration files (tsconfig loads
 * those, not imports). Data files (JSON, Markdown) are out: scripts and tests read some by path.
 *
 * Names through a barrel count for the module they resolve to, as in the gallery graph: a module an
 * app barrel re-exports but nobody imports by name is dead (delete its re-export with it). Whole
 * files only: unused exports inside a live module are left to review.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { ModuleGraph, ROOT, storyFiles, storyGlobs } from './affected-stories.ts';

/**
 * Modules kept although nothing reaches them, each with the reason. Keep this short: a module worth
 * keeping is usually worth importing. An entry that is reached again, or no longer exists, fails.
 */
export const KEEP: readonly { file: string; reason: string }[] = [];

/** The library's public entry (vite.config.ts `build.lib.entry`). */
export const LIBRARY_ENTRY = 'src/index.ts';
/** The app's HTML pages; their module scripts are entries. */
export const APP_PAGES = ['index.html'];
/** Code outside src/ and docs/: every file is a root. */
export const ROOT_GLOBS = ['*.{ts,mts,js,mjs}', '{scripts,tests,fixtures,.storybook}/**/*.{ts,tsx,mts,js,mjs}'];
/** What the check covers. */
export const CHECKED_GLOBS = ['{src,docs}/**/*.{ts,tsx,css}'];

const files = (root: string, globs: readonly string[]) =>
  [...new Set(globs.flatMap((g) => globSync(g, { cwd: root }).map((f) => f.split(sep).join('/'))))].filter((f) => !f.endsWith('.d.ts')).sort();

/** The module scripts an HTML page loads, as repo files (`src="/src/main.tsx"` → src/main.tsx). */
export const pageEntries = (root: string, page: string): string[] => {
  const html = readFileSync(resolve(root, page), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map((m) => (m[1] ?? '').replace(/^\//, '')).filter((f) => !/^[a-z]+:/i.test(f));
};

const existsIn = (root: string, file: string) => existsSync(resolve(root, file));

/** Every entry point of a repo laid out like this one. */
export const findRoots = async (root = ROOT): Promise<string[]> => {
  const pages = APP_PAGES.filter((p) => existsIn(root, p)).flatMap((p) => pageEntries(root, p));
  const library = existsIn(root, LIBRARY_ENTRY) ? [LIBRARY_ENTRY] : [];
  const stories = existsIn(root, '.storybook/main.ts') ? storyFiles(await storyGlobs(root), root) : [];
  return [...new Set([...pages, ...library, ...stories, ...files(root, ROOT_GLOBS)])].sort();
};

export interface DeadModules {
  /** Checked modules no root reaches, and not kept. */
  dead: string[];
  /** KEEP entries that are wrong: the file is gone, or something reaches it now. */
  stale: string[];
  /** Imports the graph couldn't follow (a computed import() or glob): a listed module may be loaded through one. */
  problems: string[];
  /** Modules reached, for the summary line. */
  reached: number;
  checked: number;
}

export interface DeadModuleOptions {
  root?: string;
  keep?: typeof KEEP;
  graph?: ModuleGraph;
  /**
   * Files to treat as deleted: not roots, not checked, and imports of them not followed. Lets a
   * test rehearse a trim (README, "Start a new portal") without touching the tree.
   */
  deleted?: ReadonlySet<string>;
}

const inChecked = (file: string) => file.startsWith('src/') || file.startsWith('docs/');

export const findDeadModules = (roots: readonly string[], options: DeadModuleOptions = {}): DeadModules => {
  const root = options.root ?? ROOT;
  const keep = options.keep ?? KEEP;
  const deleted = options.deleted ?? new Set<string>();
  const graph = options.graph ?? new ModuleGraph(root, { types: true });
  const reached = new Set<string>();
  for (const r of roots) {
    if (deleted.has(r)) continue;
    for (const f of graph.closure(r, '*', (_from, e) => !deleted.has(e.to))) reached.add(f);
  }
  const checked = files(root, CHECKED_GLOBS).filter((f) => !deleted.has(f));
  const kept = new Set(keep.map((k) => k.file));
  const stale: string[] = [];
  for (const k of keep) {
    if (!graph.exists(k.file) || deleted.has(k.file)) stale.push(`${k.file}: listed in KEEP, but the file no longer exists; delete the entry`);
    else if (reached.has(k.file)) stale.push(`${k.file}: listed in KEEP, but something imports it now; delete the entry`);
  }
  return {
    dead: checked.filter((f) => !reached.has(f) && !kept.has(f)),
    stale,
    // Only src/ and docs/ are checked, so only their unfollowable imports can hide a use.
    problems: graph
      .parsed()
      .filter((m) => inChecked(m.file) && reached.has(m.file))
      .flatMap((m) => m.problems),
    reached: reached.size,
    checked: checked.length,
  };
};

/** The failure message, or null when there is nothing to report. */
export const report = (result: DeadModules): string | null => {
  if (result.dead.length === 0 && result.stale.length === 0) return null;
  const lines: string[] = [];
  if (result.dead.length > 0) {
    const n = result.dead.length;
    lines.push(`Dead modules: ${String(n)} ${n === 1 ? 'file' : 'files'} under src/ or docs/ that no entry point reaches (the app, src/index.ts, a story, a test, Storybook config, a script or a config file):`);
    for (const f of result.dead) lines.push(`  ✗ ${f}`);
    lines.push(
      '',
      'Usually these are what an example you deleted used: delete them (and any barrel line re-exporting one) and run npm run check again.',
      'Kept on purpose? Add it to KEEP in scripts/dead-modules.ts, with the reason.',
      'Loaded by a new kind of entry point (an e2e/ folder, a second HTML page)? Add that to ROOT_GLOBS or APP_PAGES there.',
    );
    if (result.problems.length > 0) {
      lines.push('', 'The graph could not follow these imports; a file above may be loaded through one:');
      for (const p of result.problems) lines.push(`  ? ${p}`);
    }
  }
  if (result.stale.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Stale KEEP entries in scripts/dead-modules.ts:');
    for (const s of result.stale) lines.push(`  ✗ ${s}`);
  }
  return lines.join('\n');
};

if (import.meta.main) {
  const started = performance.now();
  const result = findDeadModules(await findRoots());
  const message = report(result);
  if (message) {
    console.error(message);
    process.exit(1);
  }
  const ms = Math.round(performance.now() - started);
  console.log(`Dead modules: none. ${String(result.checked)} modules under src/ and docs/ all reached from the entry points (${String(ms)} ms).`);
}
