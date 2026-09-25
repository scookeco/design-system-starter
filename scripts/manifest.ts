/**
 * The agent manifest: design-system.manifest.json, generated from the code, stories, usage docs,
 * guides, token usage map, CLAUDE.md and README.md.
 *
 *   node scripts/manifest.ts           write it
 *   node scripts/manifest.ts --check   fail if the committed file is stale
 *
 * The collector (scripts/manifest-collect.ts) imports TSX (usage docs, guides), so it runs inside a
 * Vite server in SSR mode. The builder is scripts/checks/manifest.ts; the schema, which documents
 * every field, is design-system.manifest.schema.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { buildManifest, MANIFEST_FILE, serialize } from './checks/manifest.ts';
import type { collect as Collect } from './manifest-collect.ts';

const root = resolve(import.meta.dirname, '..');

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});
let files: Record<string, string>;
try {
  const { collect } = (await server.ssrLoadModule('/scripts/manifest-collect.ts')) as { collect: typeof Collect };
  const { inputs } = await collect(root);
  files = { [MANIFEST_FILE]: serialize(buildManifest(inputs)) };
} finally {
  await server.close();
}

if (process.argv.includes('--check')) {
  const stale = Object.entries(files).filter(([file, fresh]) => {
    try {
      return readFileSync(join(root, file), 'utf8') !== fresh;
    } catch {
      return true; // Missing counts as stale.
    }
  });
  if (stale.length) {
    console.error(`Stale: ${stale.map(([f]) => f).join(', ')}. Run "npm run manifest" and commit the result.`);
    process.exit(1);
  }
  console.log(`${Object.keys(files).join(', ')} up to date.`);
} else {
  for (const [file, content] of Object.entries(files)) writeFileSync(join(root, file), content);
  console.log(`Wrote ${Object.keys(files).join(', ')}.`);
}
