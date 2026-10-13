import { expect, test, type Page } from '@playwright/test';
import { openStory, stories } from './storybook';

/**
 * Document numbers have two readers:
 * CSS counters draw them (Clause.css, Exhibit.css) and the index computes the same numbers for
 * Xref, Toc and tooling, kept on each number as data-number / data-letter. jsdom can't run
 * counters, so this reads what the browser drew, from the accessibility tree (the counters' alt
 * text is what assistive technology hears), and checks it against the index for every story that
 * draws a document. No screenshots here.
 */

/** Story titles whose stories draw clause numbers or exhibit letters. */
const DOCUMENT_STORIES = /^Components\/(Clause|Exhibit|Document|DocumentSection|DocumentTitle|DocumentViewer|Toc|Xref|Definitions|Change|ClauseNote|SignaturePage|Margin|DocumentHeader|Watermark)$/;

interface Drawn {
  expected: string;
  drawn: string;
}

/** For each element matching `selector`: its `attribute` (the index) and the text the browser drew for it. */
const drawnNumbers = async (page: Page, selector: string, attribute: string): Promise<Drawn[]> => {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  type AxNode = (typeof nodes)[number];
  const text = (n: AxNode): string =>
    n.role?.value === 'StaticText' ? String(n.name?.value ?? '') : (n.childIds ?? []).flatMap((id) => byId.get(id) ?? []).map(text).join('');
  const out: Drawn[] = [];
  for (const nodeId of nodeIds) {
    const { node } = await cdp.send('DOM.describeNode', { nodeId });
    const attributes = node.attributes ?? [];
    const expected = attributes[attributes.indexOf(attribute) + 1] ?? '';
    const ax = nodes.find((n) => n.backendDOMNodeId === node.backendNodeId);
    out.push({ expected, drawn: ax ? text(ax) : '' });
  }
  await cdp.detach();
  return out;
};

for (const story of stories.filter((s) => DOCUMENT_STORIES.test(s.title))) {
  test(`Document numbering / ${story.title} / ${story.name}`, async ({ page }) => {
    await openStory(page, story.id, 'light');
    for (const { expected, drawn } of await drawnNumbers(page, '.clause__number[data-number]', 'data-number')) {
      expect.soft(drawn, 'clause number drawn by the counters vs the index').toBe(expected);
    }
    for (const { expected, drawn } of await drawnNumbers(page, '.exhibit__letter[data-letter]:not([data-label])', 'data-letter')) {
      expect.soft(drawn, 'exhibit letter drawn by the counter vs the index').toBe(`Exhibit\u00a0${expected}`);
    }
  });
}
