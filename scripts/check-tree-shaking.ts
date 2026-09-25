/**
 * Tree-shaking check over the built library (run after `npm run build`, inside `npm run check`).
 *
 * For every unit with a public export, bundle `import { <Export> } from 'dist/index.js'` the way
 * a consumer's bundler would, and fail if the output contains any unit other than the one
 * imported and the units it composes (src/tokens/token-usage.json, `composesAll`).
 *
 * A unit is recognised in a bundle by its markers: string literals that appear in its own region
 * of dist/index.js and nowhere else in it, preferring the class names its stylesheets define
 * (block names such as "button" also occur as attribute values elsewhere, so they don't qualify
 * on their own). Positive controls: every unit must have a marker, and importing everything must
 * find all of them.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, type Rollup } from 'vite';
import type { TokenUsage } from './checks/token-usage.ts';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist/index.js');
const usage = JSON.parse(readFileSync(join(root, 'src/tokens/token-usage.json'), 'utf8')) as TokenUsage;
const EXTERNAL = [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/];

let code: string;
try {
  code = readFileSync(dist, 'utf8');
} catch {
  console.error('dist/index.js not found. Run "npm run build" first (npm run check does).');
  process.exit(1);
}

// 1. Split the library bundle into its source-module regions.
const regions = new Map<string, string>();
for (const m of code.matchAll(/\/\/#region src\/(?:components|primitives|layouts)\/([\w-]+)\/[^\n]*\n([\s\S]*?)\/\/#endregion/g)) {
  regions.set(m[1] ?? '', (regions.get(m[1] ?? '') ?? '') + (m[2] ?? ''));
}

// 2. Markers: class strings the unit's CSS defines, found in its region only.
const classesIn = (css: string) => new Set([...css.matchAll(/\.([a-z][a-z0-9-]*(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?)/g)].map((m) => m[1] as string));
const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const markers = new Map<string, string[]>();
const problems: string[] = [];
for (const [name, unit] of Object.entries(usage.units)) {
  const region = regions.get(name);
  if (!region) continue; // Types-only or internal units without code of their own in the bundle.
  const classes = new Set(unit.stylesheets.flatMap((file) => [...classesIn(readFileSync(join(root, file), 'utf8'))]));
  const unique = (literal: string) => occurrences(region, literal) > 0 && occurrences(code, literal) === occurrences(region, literal);
  const classMarkers = [...classes].map((c) => `"${c}"`).filter(unique);
  const found = classMarkers.length ? classMarkers : [...new Set(region.match(/"[^"\n]{4,}"/g) ?? [])].filter(unique);
  if (found.length === 0) problems.push(`${name}: no unique class-name marker in dist/index.js, so the check can't see it`);
  markers.set(name, found);
}

const bundle = async (source: string): Promise<string> => {
  const dir = mkdtempSync(join(tmpdir(), 'tree-shaking-'));
  const entry = join(dir, 'entry.js');
  writeFileSync(entry, source);
  try {
    const result = (await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'out' },
        rollupOptions: { external: EXTERNAL },
      },
    })) as Rollup.RolldownOutput[] | Rollup.RolldownOutput;
    const outputs = Array.isArray(result) ? result : [result];
    return outputs.flatMap((o) => o.output).map((chunk) => ('code' in chunk ? chunk.code : '')).join('\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const unitsIn = (output: string) => [...markers].filter(([, list]) => list.some((m) => output.includes(m))).map(([name]) => name);

// 3. Positive control: the whole library contains every unit.
const everything = await bundle(`export * from ${JSON.stringify(dist)};\n`);
const missing = [...markers.keys()].filter((name) => !unitsIn(everything).includes(name));
if (missing.length) problems.push(`importing everything did not find: ${missing.join(', ')}`);

// 4. One import per unit: only that unit and what it composes.
let checked = 0;
for (const [name, unit] of Object.entries(usage.units)) {
  const first = unit.exports[0];
  if (!first || !markers.has(name)) continue;
  const output = await bundle(`export { ${first} } from ${JSON.stringify(dist)};\n`);
  const allowed = new Set([name, ...unit.composesAll]);
  const extra = unitsIn(output).filter((n) => !allowed.has(n));
  if (!unitsIn(output).includes(name)) problems.push(`import { ${first} }: the bundle does not contain ${name} itself`);
  if (extra.length) problems.push(`import { ${first} } also pulls in ${extra.join(', ')}`);
  checked += 1;
}

if (problems.length) {
  console.error(`Tree-shaking check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Tree-shaking: ${String(checked)} single-component imports pull in only what they compose.`);
