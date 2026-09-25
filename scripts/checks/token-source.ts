/**
 * Reads the DTCG token source independently of Style Dictionary, so the checks
 * below do not trust the build they are checking. The model itself lives in token-model.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseTokens, type Tier, type TokenMap } from './token-model.ts';

export * from './token-model.ts';

export const loadTokenSource = (dir: string): TokenMap => {
  const docs: { tier: Tier; file: string; json: Record<string, unknown> }[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) visit(full);
      else if (entry.endsWith('.json')) {
        const tier = relative(dir, full).split(/[\\/]/)[0] as Tier;
        docs.push({ tier, file: relative(dir, full), json: JSON.parse(readFileSync(full, 'utf8')) as Record<string, unknown> });
      }
    }
  };
  visit(dir);
  return parseTokens(docs);
};

