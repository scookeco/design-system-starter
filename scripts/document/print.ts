/**
 * Print / PDF render target: npm run document:print -- <story-id> [out.pdf]
 * Headless Chromium with the print stylesheet: named letter pages, running header and footer in the
 * page margins, every Conditional branch unless the Document's printMode is resolved.
 */
import { writeFileSync } from 'node:fs';
import { args, openDocument } from './open.ts';

const { story, out = `${story}.pdf` } = args('Usage: npm run document:print -- <story-id> [out.pdf]');
const { page, close } = await openDocument(story, 'print');
try {
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  writeFileSync(out, pdf);
  const pages = pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;
  console.log(`document:print wrote ${out}: ${String(pages)} page${pages === 1 ? '' : 's'}.`);
} finally {
  await close();
}
