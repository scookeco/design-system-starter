/**
 * Opens one story's Document in headless Chromium, from the built Storybook (npm run build-storybook),
 * alone on the page: the render targets (print, envelope, export) read the document, not the gallery.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const root = resolve(import.meta.dirname, '../..');
const STATIC = join(root, 'storybook-static');
const PORT = Number(process.env.DOCUMENT_PORT ?? 6040);

const waitFor = async (url: string) => {
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Storybook did not start on ${url}`);
};

export interface OpenDocument {
  page: Page;
  close: () => Promise<void>;
}

/** Serves storybook-static, opens the story and leaves only its document (and the viewer around it) on the page. */
export async function openDocument(storyId: string, media: 'screen' | 'print' = 'screen'): Promise<OpenDocument> {
  if (!existsSync(join(STATIC, 'index.json'))) throw new Error('storybook-static is missing: run npm run build-storybook first.');
  const server: ChildProcess = spawn('npx', ['vite', 'preview', '--outDir', STATIC, '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
  let browser: Browser | undefined;
  try {
    await waitFor(`http://localhost:${String(PORT)}/index.json`);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(`http://localhost:${String(PORT)}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`);
    await page.waitForSelector('[data-doc="document"]', { state: 'attached' });
    await page.evaluate(() => {
      const keep = document.querySelector('.document-viewer') ?? document.querySelector('[data-doc="document"]');
      if (keep) document.body.replaceChildren(keep);
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    });
    await page.emulateMedia({ media });
    const opened = browser;
    return {
      page,
      close: async () => {
        await opened.close();
        server.kill();
      },
    };
  } catch (error) {
    await browser?.close();
    server.kill();
    throw error;
  }
}

/** The story id and output path from the command line: `-- <story-id> [out]`. */
export const args = (usage: string): { story: string; out: string | undefined } => {
  const [story, out] = process.argv.slice(2).filter((a) => a !== '--');
  if (!story) {
    console.error(usage);
    process.exit(1);
  }
  return { story, out };
};
