import { expect, test, type Page } from '@playwright/test';
import { validateDocument } from '../../src/components/DocumentRuntime/validate';
import { openStory, stories } from './storybook';

/**
 * Two checks per document story, read from the browser. No screenshots here.
 *
 * The validator (src/components/DocumentRuntime/validate.ts) on the rendered document: one root, no broken
 * reference, every capture element assigned to a declared party when the document is filled, areas
 * only on a grid. Stories that show a broken document on purpose are listed in BROKEN_ON_PURPOSE.
 *
 * Document numbers have two readers:
 * CSS counters draw them (Clause.css, Exhibit.css) and the index computes the same numbers for
 * Xref, Toc and tooling, kept on each number as data-number / data-letter. jsdom can't run
 * counters, so this reads what the browser drew, from the accessibility tree (the counters' alt
 * text is what assistive technology hears), and checks it against the index for every story that
 * draws a document. No screenshots here.
 */

/** The document family's story titles: every story of these draws a Document. */
const DOCUMENT_STORIES =
  /^Components\/(Acknowledge|Address|Barcode|Callout|Change|Clause|ClauseNote|Computed|Conditional|Definitions|Document|DocumentAttachment|DocumentCheckbox|DocumentField|DocumentFieldset|DocumentHeader|DocumentList|DocumentRadioGroup|DocumentSection|DocumentSelect|DocumentTitle|DocumentViewer|Exhibit|Figure|KeyValue|Letterhead|LineItems|Margin|Parties|Repeat|RoleRegion|Seal|Signature|SignatureBlock|SignaturePage|Step|Toc|Watermark|Xref)$/;

/** Stories that show what the validator catches, so they fail it on purpose: the errors they must show. */
const BROKEN_ON_PURPOSE: Record<string, RegExp> = {
  'components-xref--broken': /Unresolved reference/,
  'components-clause--unresolved': /Unresolved reference|twice/,
  'components-definitions--defined-twice': /twice/,
};

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
  test(`Document / ${story.title} / ${story.name}`, async ({ page }) => {
    await openStory(page, story.id, 'light');
    const roots = await page.locator('[data-doc="document"]').count();
    test.skip(roots === 0, 'renders no Document (a part shown on its own)');
    // Each Document on its own (a story may set two side by side).
    const problems = { errors: (await page.evaluate(`[...document.querySelectorAll('[data-doc="document"]')].flatMap((root) => (${validateDocument.toString()})(root).errors)`)) as string[] };
    const purpose = BROKEN_ON_PURPOSE[story.id];
    if (purpose) expect.soft(problems.errors.join('\n'), 'a story broken on purpose shows the problem').toMatch(purpose);
    else expect.soft(problems.errors, 'validator errors').toEqual([]);
    for (const { expected, drawn } of await drawnNumbers(page, '.clause__number[data-number]', 'data-number')) {
      expect.soft(drawn, 'clause number drawn by the counters vs the index').toBe(expected);
    }
    for (const { expected, drawn } of await drawnNumbers(page, '.exhibit__letter[data-letter]:not([data-label])', 'data-letter')) {
      expect.soft(drawn, 'exhibit letter drawn by the counter vs the index').toBe(`Exhibit\u00a0${expected}`);
    }
  });
}
