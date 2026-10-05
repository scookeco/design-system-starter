/**
 * Native reference screenshots for `npm run test:visual:changed` on a platform without committed
 * baselines (macOS, Windows): the stories it is about to check, rendered natively at the merge base.
 *
 * Committed baselines are Linux, made in the Playwright image (npm run test:visual:canonical), and
 * stay the source of truth. A Mac renders fonts and anti-aliasing differently, so it can't compare
 * against them, and comparing against screenshots of the branch itself would catch nothing. So the
 * reference is the same machine, the same browser and the same specs, rendering the merge base's
 * Storybook: any difference is the branch's.
 *
 *   1. Check out the merge base in a temporary git worktree, sharing node_modules when the lockfile
 *      is the same (a different lockfile gets its own npm ci: different dependencies render differently).
 *   2. Build its Storybook, and run this checkout's stories spec against it with VISUAL_STEPS=visual,
 *      writing the screenshots into node_modules/.cache/visual-reference/<platform>/<key>/.
 *   3. The key is the merge base plus a hash of what renders a screenshot besides the gallery (the
 *      Playwright version, its config and the visual specs), so a cached reference is reused across
 *      runs until one of those changes, and only stories it lacks are rendered.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './affected-stories.ts';

const THEMES = ['light', 'dark'] as const;

export interface Reference {
  /** Where the reference screenshots are: VISUAL_SNAPSHOT_DIR for the run that compares. */
  dir: string;
  /** Stories rendered now, and stories whose reference was already cached. */
  rendered: number;
  reused: number;
  /** Stories that don't exist at the merge base: nothing to compare their screenshots with. */
  added: string[];
}

const run = (command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) => {
  const r = spawnSync(command, args, { cwd, stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd} (exit ${String(r.status)})`);
};
const git = (...args: string[]) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout;
};

/** What renders a screenshot besides the gallery itself. */
const harnessKey = () => {
  const hash = createHash('sha256');
  hash.update(JSON.parse(readFileSync(join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8')).version as string);
  for (const file of ['playwright.config.ts', ...globSync('tests/visual/*.ts', { cwd: ROOT }).sort()]) hash.update(`${file}\0${readFileSync(join(ROOT, file), 'utf8')}\0`);
  return hash.digest('hex').slice(0, 12);
};

export const referenceDir = (mergeBase: string) => join(ROOT, 'node_modules/.cache/visual-reference', process.platform, `${mergeBase.slice(0, 12)}-${harnessKey()}`);

export const ensureReference = (mergeBase: string, storyIds: readonly string[]): Reference => {
  const dir = referenceDir(mergeBase);
  const cached = (id: string) => THEMES.every((theme) => existsSync(join(dir, `${id}--${theme}.png`)));
  const missing = storyIds.filter((id) => !cached(id));
  if (missing.length === 0) return { dir, rendered: 0, reused: storyIds.length, added: [] };

  const worktree = mkdtempSync(join(tmpdir(), 'visual-reference-'));
  const modules = join(worktree, 'node_modules');
  let linked = false;
  try {
    console.log(`\nReference: ${String(missing.length)} of ${String(storyIds.length)} stories at the merge base ${mergeBase.slice(0, 7)} (native, cached in ${dir.slice(ROOT.length + 1)})`);
    git('worktree', 'add', '--detach', '--quiet', worktree, mergeBase);
    const sameLockfile = git('show', `${mergeBase}:package-lock.json`) === readFileSync(join(ROOT, 'package-lock.json'), 'utf8');
    if (sameLockfile) {
      symlinkSync(join(ROOT, 'node_modules'), modules, process.platform === 'win32' ? 'junction' : 'dir');
      linked = true;
    } else {
      console.log('  The lockfile changed since the merge base: installing its dependencies (npm ci) for the reference.');
      run('npm', ['ci', '--no-audit', '--no-fund'], worktree);
    }
    run('npm', ['run', 'build-storybook'], worktree);

    const built = JSON.parse(readFileSync(join(worktree, 'storybook-static/index.json'), 'utf8')) as { entries: Record<string, unknown> };
    const atBase = missing.filter((id) => id in built.entries);
    const added = missing.filter((id) => !(id in built.entries));
    if (atBase.length > 0) {
      mkdirSync(dir, { recursive: true });
      const ids = join(worktree, 'reference-ids.json');
      writeFileSync(ids, JSON.stringify(atBase));
      // This checkout's specs against the merge base's build, on a port of its own so a server
      // already serving this checkout's gallery (reuseExistingServer) is never mistaken for it.
      run('npx', ['playwright', 'test', 'tests/visual/stories.spec.ts', '--update-snapshots=all', '--reporter=dot'], ROOT, {
        ...process.env,
        STORYBOOK_STATIC: join(worktree, 'storybook-static'),
        VISUAL_SNAPSHOT_DIR: dir,
        VISUAL_STEPS: 'visual',
        STORY_IDS_FILE: ids,
        PLAYWRIGHT_PORT: String(Number(process.env.PLAYWRIGHT_PORT ?? 6007) + 10),
      });
    }
    return { dir, rendered: atBase.length, reused: storyIds.length - missing.length, added };
  } finally {
    // Unlink the shared node_modules first: removing the worktree must never reach through it.
    if (linked) unlinkSync(modules);
    spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT });
    rmSync(worktree, { recursive: true, force: true });
    spawnSync('git', ['worktree', 'prune'], { cwd: ROOT });
  }
};
