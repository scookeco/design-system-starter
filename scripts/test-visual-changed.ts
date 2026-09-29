/**
 * npm run test:visual:changed: screenshots, axe and the WCAG 2.2 checks for only the stories a
 * branch can affect. The graph and the mapping are in scripts/affected-stories.ts.
 *
 *   npm run test:visual:changed                          against origin/main, with uncommitted changes
 *   npm run test:visual:changed -- --base <ref>          against another base
 *   npm run test:visual:changed -- --dry-run             print the plan only (no build, no run)
 *   npm run test:visual:changed -- --list                also print every story and Docs-tab id it runs
 *   npm run test:visual:changed -- --self-check          compare the graph with Storybook's own module graph
 *   npm run test:visual:changed -- -- <playwright args>  e.g. -- --update-snapshots=changed, or -- --grep @a11y
 *
 * Builds Storybook first (npm run build-storybook) when storybook-static/ is missing or older than
 * anything the gallery reads. Playwright gets the chosen ids in the file named by STORY_IDS_FILE,
 * which tests/visual/storybook.ts reads to filter its stories and Docs tabs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, matchesGlob, sep } from 'node:path';
import {
  affectedEntries,
  classify,
  cssScopeProblems,
  EVERYTHING,
  loadGallery,
  ROOT,
  statsProblems,
  storyFiles,
  storyGlobs,
  type IndexEntry,
} from './affected-stories.ts';

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const own = split === -1 ? argv : argv.slice(0, split);
const passthrough = split === -1 ? [] : argv.slice(split + 1);
const flag = (name: string) => own.includes(name);
const option = (name: string) => {
  const i = own.indexOf(name);
  return i === -1 ? undefined : own[i + 1];
};
const known = new Set(['--base', '--dry-run', '--list', '--self-check', '--verbose']);
for (const [i, arg] of own.entries()) {
  if (arg.startsWith('--') && !known.has(arg)) {
    console.error(`Unknown option ${arg}. Pass Playwright options after a second "--": npm run test:visual:changed -- -- ${arg}`);
    process.exit(2);
  }
  if (!arg.startsWith('--') && own[i - 1] !== '--base') {
    console.error(`Unexpected argument ${arg}.`);
    process.exit(2);
  }
}

const git = (...args: string[]) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout.trim();
};
const lines = (s: string) => s.split('\n').filter(Boolean);
const INDEX = join(ROOT, 'storybook-static/index.json');
const started = performance.now();
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const buildStorybook = (extra: string[] = []) => {
  console.log(`\nBuilding Storybook (npm run build-storybook${extra.length ? ` -- ${extra.join(' ')}` : ''})…`);
  const r = spawnSync('npm', ['run', 'build-storybook', ...(extra.length ? ['--', ...extra] : [])], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const stories = storyFiles(await storyGlobs());
const gallery = loadGallery(stories);

// --self-check: the graph against the bundler's, and the CSS scope it relies on.
if (flag('--self-check')) {
  const dir = mkdtempSync(join(tmpdir(), 'visual-changed-'));
  try {
    buildStorybook(['--stats-json', dir]);
    const stats = JSON.parse(readFileSync(join(dir, 'preview-stats.json'), 'utf8')) as Parameters<typeof statsProblems>[1];
    const result = statsProblems(gallery, stats);
    const sheets = globSync('src/**/*.css', { cwd: ROOT })
      .map((f) => f.split(sep).join('/'))
      .filter((f) => !f.startsWith('src/styles/'));
    const scope = cssScopeProblems(gallery.graph, sheets, [...gallery.reachable]);
    console.log(`\nBundler graph: ${String(result.modules)} modules, ${String(result.edges)} import edges between repo files, all checked against this graph.`);
    console.log(`CSS scope: ${String(sheets.length)} system stylesheets, ${String(gallery.reachable.size)} modules checked.`);
    for (const p of [...result.problems, ...scope]) console.log(`  ✗ ${p}`);
    if (result.problems.length + scope.length > 0) process.exit(1);
    console.log('  ✓ every edge the bundler saw is in the graph, and every stylesheet styles only its own blocks');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  process.exit(0);
}

// 1. What changed: the branch since its merge base with the base, plus staged, unstaged and untracked files.
const base = option('--base') ?? 'origin/main';
const mergeBase = git('merge-base', base, 'HEAD');
const changed = [...new Set([...lines(git('diff', '--name-only', '--no-renames', mergeBase)), ...lines(git('ls-files', '--others', '--exclude-standard'))])].sort();
const deleted = new Set(changed.filter((f) => !existsSync(join(ROOT, f))));
const sorted = classify(gallery, changed, deleted);

// 2. The story index, rebuilt when anything the gallery reads is newer than it.
// The Playwright side (specs, helpers, config, baselines) isn't part of the build.
const notBuilt = ['tests/visual/*.ts', 'tests/visual/__screenshots__/**', 'playwright.config.ts'];
const inputs = new Set<string>([...gallery.reachable, ...stories]);
for (const { pattern } of EVERYTHING) if (!notBuilt.includes(pattern)) for (const f of globSync(pattern, { cwd: ROOT, exclude: notBuilt })) inputs.add(f.split(sep).join('/'));
for (const f of inputs) if (notBuilt.some((p) => matchesGlob(f, p))) inputs.delete(f);
const newest = Math.max(...[...inputs].filter((f) => existsSync(join(ROOT, f)) && statSync(join(ROOT, f)).isFile()).map((f) => statSync(join(ROOT, f)).mtimeMs));
const readIndex = () => (JSON.parse(readFileSync(INDEX, 'utf8')) as { entries: Record<string, IndexEntry> }).entries;
const staleReason = () => {
  if (!existsSync(INDEX)) return 'storybook-static/ is missing';
  if (statSync(INDEX).mtimeMs < newest) return 'storybook-static/ is older than the sources';
  const indexed = new Set(Object.values(readIndex()).map((e) => e.importPath.replace(/^\.\//, '')));
  const missing = stories.filter((s) => !indexed.has(s));
  return missing.length > 0 ? `storybook-static/ lacks ${missing[0] ?? ''}` : undefined;
};
const stale = staleReason();
if (stale && !flag('--dry-run')) buildStorybook();
if (stale && flag('--dry-run') && !existsSync(INDEX)) {
  console.error(`${stale}: run "npm run build-storybook" once, then --dry-run can map files to stories.`);
  process.exit(1);
}
const index = Object.values(readIndex());

// 3. The plan.
const everything = sorted.everything;
const affected = affectedEntries(gallery, sorted.graphed, index, sorted.baselines);
const run = everything ? index : affected.entries;
const isFixture = (e: IndexEntry) => e.tags?.includes('check-fixture') === true;
const visualStories = run.filter((e) => e.type === 'story' && !e.tags?.includes('no-visual'));
const fixtures = run.filter((e) => e.type === 'story' && isFixture(e));
const docs = run.filter((e) => e.type === 'docs');
// Per story: a screenshot and an axe run in each theme, and one WCAG 2.2 pass. Per fixture: one WCAG 2.2 test. Per Docs tab: axe.
// Plus the page-less "every check has a fixture" test, which always runs.
const count = (stories: number, fixtureCount: number, docsCount: number) => stories * 5 + fixtureCount + docsCount + 1;
const tests = run.length === 0 ? 0 : count(visualStories.length, fixtures.length, docs.length);
const plural = (n: number, one: string, many = `${one}s`) => `${String(n)} ${n === 1 ? one : many}`;

console.log(`\nVisual checks for changes since ${base} (merge base ${mergeBase.slice(0, 7)}), including uncommitted and untracked files`);
if (stale && flag('--dry-run')) console.log(`  (${stale}; the next real run rebuilds it, and new stories may add to this plan)`);
console.log(
  `  ${plural(changed.length, 'changed file')}: ${String(sorted.global.length)} reach every story, ${String(sorted.graphed.length)} feed the graph, ${plural(sorted.baselines.length, 'baseline')}, ${String(sorted.ignored.length)} can't change a story`,
);
if (everything) {
  console.log(`  → everything: ${everything.file}: ${everything.reason}`);
} else {
  const storyFilesHit = [...affected.files.keys()];
  console.log(`  → ${plural(storyFilesHit.length, 'affected story file')} → ${plural(visualStories.length, 'story', 'stories')}, ${plural(docs.length, 'Docs tab')}${fixtures.length ? `, ${plural(fixtures.length, 'WCAG 2.2 fixture')}` : ''}`);
}
console.log(`  → ${plural(tests, 'test')} (full run: ${String(count(index.filter((e) => e.type === 'story' && !e.tags?.includes('no-visual')).length, index.filter(isFixture).length, index.filter((e) => e.type === 'docs').length))})`);
if (!everything && affected.files.size > 0) {
  const rows = [...affected.files].map(([file, via]) => {
    const inFile = run.filter((e) => e.importPath.replace(/^\.\//, '') === file);
    const s = inFile.filter((e) => e.type === 'story').length;
    const d = inFile.some((e) => e.type === 'docs');
    const title = inFile[0]?.title ?? file;
    return `    ${title}: ${s > 0 ? plural(s, 'story', 'stories') : ''}${s > 0 && d ? ' + ' : ''}${d ? 'Docs tab' : ''}   ← ${via.slice(0, 2).join(', ')}${via.length > 2 ? ` +${String(via.length - 2)}` : ''}`;
  });
  const limit = flag('--verbose') ? rows.length : 25;
  for (const row of rows.slice(0, limit)) console.log(row);
  if (rows.length > limit) console.log(`    … and ${String(rows.length - limit)} more (--verbose lists them all)`);
}
if (flag('--list')) for (const e of run) console.log(`  ${e.id}`);
if (flag('--dry-run')) process.exit(0);
if (tests === 0) {
  console.log('\nNothing to run: no story can see these changes.');
  process.exit(0);
}

// 4. Run Playwright on exactly those entries.
const env = { ...process.env };
let dir: string | undefined;
if (!everything) {
  dir = mkdtempSync(join(tmpdir(), 'visual-changed-'));
  env.STORY_IDS_FILE = join(dir, 'ids.json');
  writeFileSync(env.STORY_IDS_FILE, JSON.stringify(run.map((e) => e.id)));
}
console.log(`\nnpx playwright test ${passthrough.join(' ')}${everything ? '' : ` (STORY_IDS_FILE: ${String(run.length)} ids)`}`);
const playwright = spawnSync('npx', ['playwright', 'test', ...passthrough], { cwd: ROOT, stdio: 'inherit', env });
if (dir) rmSync(dir, { recursive: true, force: true });
console.log(`\ntest:visual:changed finished in ${seconds(performance.now() - started)}`);
process.exit(playwright.status ?? 1);

