/**
 * npm run check: every non-visual gate, run concurrently where nothing orders them, with a timing
 * per stage at the end.
 *
 * Each stage is an npm script, so `npm run <stage>` still runs one alone. A stage starts once the
 * stages it needs have passed (size reads dist/, so it waits for build); the rest start at once.
 * Output is buffered per stage and printed whole when it ends, so parallel logs never interleave:
 * a failed stage prints its output in full, a passing one only its name and time (all of it with
 * --verbose). In GitHub Actions each stage's output is a collapsible group.
 *
 *   npm run check                 every stage
 *   npm run check -- --verbose    print passing stages' output too
 *   npm run check -- --serial     one at a time, in order (to compare, or on a small machine)
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

interface Stage {
  /** The npm script. */
  script: string;
  /** Stages that must pass first. */
  needs?: string[];
}

/** In the order `--serial` runs them (the order `check` used to chain them in). */
const STAGES: Stage[] = [
  { script: 'tokens:check' },
  { script: 'manifest:check' },
  { script: 'typecheck' },
  { script: 'lint:js' },
  { script: 'lint:css' },
  { script: 'dead-modules' },
  { script: 'test' },
  { script: 'test:rules' },
  { script: 'build' },
  { script: 'build:app' },
  { script: 'size', needs: ['build'] },
];

const ROOT = resolve(import.meta.dirname, '..');
const verbose = process.argv.includes('--verbose');
const serial = process.argv.includes('--serial');
const GITHUB = Boolean(process.env.GITHUB_ACTIONS);
const started = performance.now();
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

interface Result {
  script: string;
  ok: boolean;
  ms: number;
  output: string;
  skipped?: boolean;
}

const runStage = (script: string): Promise<Result> =>
  new Promise((done) => {
    const t = performance.now();
    const chunks: Buffer[] = [];
    // FORCE_COLOR keeps each tool's colours though its output is piped here.
    const child = spawn('npm', ['run', '--silent', script], { cwd: ROOT, env: { ...process.env, FORCE_COLOR: process.stdout.isTTY ? '1' : '0' }, shell: process.platform === 'win32' });
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => chunks.push(c));
    child.on('close', (code) => done({ script, ok: code === 0, ms: performance.now() - t, output: Buffer.concat(chunks).toString() }));
    child.on('error', (error) => done({ script, ok: false, ms: performance.now() - t, output: String(error) }));
  });

const report = (r: Result) => {
  const mark = r.skipped ? '–' : r.ok ? '✓' : '✗';
  console.log(`${mark} ${r.script} ${r.skipped ? '(skipped: a stage it needs failed)' : seconds(r.ms)}`);
  if (r.skipped || (r.ok && !verbose) || r.output.trim() === '') return;
  if (GITHUB) console.log(`::group::${r.script} output`);
  console.log(r.output.trimEnd());
  if (GITHUB) console.log('::endgroup::');
};

const results = new Map<string, Result>();
const pending = new Map<string, Promise<Result>>();
const start = (stage: Stage): Promise<Result> => {
  const existing = pending.get(stage.script);
  if (existing) return existing;
  const promise = (async () => {
    const needs = await Promise.all((stage.needs ?? []).map((name) => start(STAGES.find((s) => s.script === name) as Stage)));
    const result = needs.every((n) => n.ok) ? await runStage(stage.script) : { script: stage.script, ok: false, ms: 0, output: '', skipped: true };
    results.set(stage.script, result);
    report(result);
    return result;
  })();
  pending.set(stage.script, promise);
  return promise;
};

console.log(`check: ${String(STAGES.length)} stages${serial ? ', one at a time' : ', concurrently where nothing orders them'}\n`);
if (serial) for (const stage of STAGES) await start(stage);
else await Promise.all(STAGES.map(start));

const all = STAGES.map((s) => results.get(s.script) as Result);
const width = Math.max(...all.map((r) => r.script.length));
console.log(`\nStages (check, ${seconds(performance.now() - started)} wall clock, ${seconds(all.reduce((sum, r) => sum + r.ms, 0))} if run one after another)`);
for (const r of [...all].sort((a, b) => b.ms - a.ms)) console.log(`  ${r.script.padEnd(width)}  ${(r.skipped ? 'skipped' : seconds(r.ms)).padStart(7)}  ${r.ok ? '' : r.skipped ? '' : 'FAILED'}`);
const failed = all.filter((r) => !r.ok && !r.skipped);
if (failed.length > 0) {
  console.log(`\n${String(failed.length)} failed: ${failed.map((r) => r.script).join(', ')} (output above)`);
  process.exit(1);
}
