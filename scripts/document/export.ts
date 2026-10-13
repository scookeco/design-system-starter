/**
 * Data export render target: npm run document:export -- <story-id> [out.json]
 * Every captured value by name, Repeat rows as lists, Computed values included, read from the
 * rendered document alone (exportDocument), plus the validator's verdict on it.
 */
import { writeFileSync } from 'node:fs';
import { exportDocument } from '../../src/components/DocumentRuntime/collect.ts';
import { validateDocument } from '../../src/components/DocumentRuntime/validate.ts';
import { args, openDocument } from './open.ts';

const { story, out } = args('Usage: npm run document:export -- <story-id> [out.json]');
const { page, close } = await openDocument(story);
try {
  // Both functions are import-free, so they run in the page as written.
  const exported = await page.evaluate(`(${exportDocument.toString()})(document.body)`);
  const problems = await page.evaluate(`(${validateDocument.toString()})(document.body)`);
  const json = JSON.stringify({ ...(exported as object), problems }, null, 2);
  if (out) writeFileSync(out, json);
  else console.log(json);
} finally {
  await close();
}
