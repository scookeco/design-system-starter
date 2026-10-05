/**
 * npm run test:visual:canonical (alias test:visual:docker): the visual checks in the CI image, on this
 * machine: the canonical screenshot environment. Optional; everyday local runs are native (test:visual:changed).
 *
 * Linux baselines are made, and checked in CI, inside mcr.microsoft.com/playwright at the version the
 * lockfile pins, on x86 (linux/amd64). Screenshots depend on the fonts the browser renders with, which
 * the image fixes, and on the CPU: arm64 rasterises backdrops and shadows a little differently. So this
 * runs the same x86 image (Docker Desktop runs it through Rosetta on Apple silicon), and its PNGs are
 * CI's byte for byte. That is how a change's Linux baselines are written and committed with the change.
 *
 *   npm run test:visual:canonical                     the stories your changes reach (test:visual:changed)
 *   npm run test:visual:canonical -- --update         and rewrite their baselines where they changed
 *   npm run test:visual:canonical -- --full           regenerate every Linux baseline (deletes the old ones first;
 *                                                  about an hour under Rosetta: the workflow's "full" is quicker)
 *   npm run test:visual:canonical -- -- <args>        passed on to test:visual:changed (e.g. -- --base <ref>)
 *
 * New stories get their baselines written on any run; a changed screenshot fails unless --update.
 * node_modules lives in a Docker volume keyed by the lockfile, so the host's (macOS) install is left alone.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const own = split === -1 ? argv : argv.slice(0, split);
const passthrough = split === -1 ? [] : argv.slice(split + 1);
for (const arg of own) {
  if (!['--update', '--full'].includes(arg)) {
    console.error(`Unknown option ${arg}. Options: --update, --full; anything after "--" goes to test:visual:changed.`);
    process.exit(2);
  }
}

/** The image is the lockfile's Playwright, so the browser and its fonts match CI exactly. */
const lockText = readFileSync(join(ROOT, 'package-lock.json'), 'utf8');
const lock = JSON.parse(lockText) as { packages: Record<string, { version?: string }> };
const version = lock.packages['node_modules/@playwright/test']?.version;
if (!version) {
  console.error('package-lock.json has no node_modules/@playwright/test entry.');
  process.exit(1);
}
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const PLATFORM = 'linux/amd64';
const volume = `ds-node-modules-amd64-${createHash('sha256').update(lockText).digest('hex').slice(0, 12)}`;

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('Docker isn’t running. Start Docker Desktop, then run this again.');
  process.exit(1);
}

const inner = own.includes('--full')
  ? 'rm -rf tests/visual/__screenshots__/linux && npm run test:visual:update'
  : ['npm run test:visual:changed --', ...passthrough.map((a) => `'${a.replaceAll("'", "'\\''")}'`), '--', own.includes('--update') ? '--update-snapshots=changed' : ''].join(' ');
const script = [
  'git config --global --add safe.directory /work',
  // One install per lockfile: the volume is named for it, and the stamp says the install finished.
  '[ -f node_modules/.docker-installed ] || (npm ci --no-audit --no-fund && touch node_modules/.docker-installed)',
  inner,
].join(' && ');

console.log(`${image} · node_modules in volume ${volume}\n$ ${inner}\n`);
const run = spawnSync(
  'docker',
  // --ipc=host: Chromium needs more shared memory than Docker's 64 MB default.
  ['run', '--rm', '--platform', PLATFORM, '--ipc=host', '-v', `${ROOT}:/work`, '-v', `${volume}:/work/node_modules`, '-w', '/work', image, 'bash', '-c', script],
  { stdio: 'inherit' },
);
process.exit(run.status ?? 1);
