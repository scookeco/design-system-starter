/**
 * Token usage map: src/tokens/token-usage.json, generated from the system's stylesheets and TSX.
 *
 *   node scripts/token-usage.ts           write the map
 *   node scripts/token-usage.ts --check   fail if the committed map is stale
 *
 * The logic lives in scripts/checks/token-usage.ts (tests/unit/token-usage.test.ts runs it too);
 * the schema, which documents every field, is src/tokens/token-usage.schema.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildTokenUsage, collectUnits, serialize } from './checks/token-usage.ts';
import { loadTokenSource } from './checks/token-source.ts';

const root = resolve(import.meta.dirname, '..');
export const USAGE_FILE = 'src/tokens/token-usage.json';

const fresh = serialize(buildTokenUsage(collectUnits(root), loadTokenSource(join(root, 'tokens'))));
const target = join(root, USAGE_FILE);

if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(target, 'utf8');
  } catch {
    // Missing counts as stale.
  }
  if (committed !== fresh) {
    console.error(`${USAGE_FILE} is stale. Run "npm run tokens" and commit the result.`);
    process.exit(1);
  }
  console.log(`${USAGE_FILE} is up to date.`);
} else {
  writeFileSync(target, fresh);
  console.log(`Wrote ${USAGE_FILE}.`);
}
