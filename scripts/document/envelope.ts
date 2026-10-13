/**
 * eSignature envelope render target: npm run document:envelope -- <story-id> [out.json]
 * Lays the document out as it prints, then reads each capture element's box from the rendered DOM
 * and emits Docusign eSignature recipients (from Parties: kind → array, order → routingOrder) with
 * their tabs (pageNumber, xPosition, yPosition, width, height in points). Anchor strings are never
 * used: the source knows where everything is. Writes JSON only; it calls no API.
 */
import { writeFileSync } from 'node:fs';
import { args, openDocument } from './open.ts';

const { story, out } = args('Usage: npm run document:envelope -- <story-id> [out.json]');
const { page, close } = await openDocument(story, 'print');
try {
  // The printed layout: a letter page's content box is 6.5in × 9in (96 px per inch on screen).
  await page.setViewportSize({ width: 624, height: 864 });
  const envelope = await page.evaluate(() => {
    const PX = 96;
    const PT = 72;
    const MARGIN = 1 * PX;
    const PAGE_HEIGHT = 9 * PX;
    const doc = document.querySelector<HTMLElement>('[data-doc="document"]');
    if (!doc) throw new Error('No document on the page');
    const top = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
    const grid = doc.dataset.shell === 'grid';

    // Where each printed page starts: a grid page is one page; a flow document breaks every 9in and at each DocumentPage.
    const forced = [...doc.querySelectorAll('[data-doc="page"]')].map(top).sort((a, b) => a - b);
    const starts: number[] = [];
    const docBottom = top(doc) + doc.getBoundingClientRect().height;
    if (grid) starts.push(...forced);
    else {
      let cursor = top(doc);
      for (const next of [...forced, docBottom]) {
        for (; cursor < next - 1; cursor += PAGE_HEIGHT) starts.push(cursor);
        cursor = next;
      }
    }
    const placeOf = (el: Element) => {
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY;
      const index = Math.max(0, starts.filter((s) => s <= y + 0.5).length - 1);
      const pageEl = grid ? el.closest('[data-doc="page"]') : null;
      const originX = pageEl ? pageEl.getBoundingClientRect().left : doc.getBoundingClientRect().left - MARGIN;
      const originY = pageEl ? top(pageEl) : (starts[index] ?? 0) - MARGIN;
      const pt = (v: number) => Math.round((v * PT) / PX);
      return { pageNumber: String(index + 1), xPosition: String(pt(r.left - originX)), yPosition: String(pt(y - originY)), width: String(pt(r.width)), height: String(pt(r.height)) };
    };

    const ARRAY: Record<string, string> = { signer: 'signers', cc: 'carbonCopies', witness: 'witnesses', approver: 'agents' };
    const parties = [...doc.querySelectorAll<HTMLElement>('[data-doc="party"]')];
    const recipients: Record<string, Record<string, unknown>[]> = {};
    const byRole = new Map<string, Record<string, Record<string, unknown>[]>>();
    parties.forEach((p, i) => {
      const tabs: Record<string, Record<string, unknown>[]> = {};
      byRole.set(p.dataset.role ?? '', tabs);
      const list = (recipients[ARRAY[p.dataset.kind ?? 'signer'] ?? 'signers'] ??= []);
      list.push({ recipientId: String(i + 1), roleName: p.dataset.role, name: p.dataset.name, routingOrder: p.dataset.order ?? '1', tabs });
    });
    const TAB: Record<string, string> = { signature: 'signHereTabs', initials: 'initialHereTabs', 'date-signed': 'dateSignedTabs', checkbox: 'checkboxTabs', select: 'listTabs', attachment: 'signerAttachmentTabs', 'radio-group': 'radioGroupTabs' };
    const FIELD: Record<string, string> = { date: 'dateTabs', ssn: 'ssnTabs', number: 'numberTabs', currency: 'numericalTabs', email: 'emailTabs' };
    const problems: string[] = [];
    for (const el of doc.querySelectorAll<HTMLElement>('[data-doc][data-role]')) {
      const kind = el.dataset.doc ?? '';
      const type = kind === 'field' ? (FIELD[el.dataset.type ?? 'text'] ?? 'textTabs') : TAB[kind];
      if (!type) continue;
      const tabs = byRole.get(el.dataset.role ?? '');
      if (!tabs) {
        problems.push(`No party for role "${el.dataset.role ?? ''}"`);
        continue;
      }
      const tab: Record<string, unknown> = { tabLabel: el.dataset.name ?? kind, required: String(el.dataset.required === 'true'), ...placeOf(el) };
      const conditional = el.closest<HTMLElement>('[data-doc="conditional"]')?.dataset.when;
      const simple = conditional ? /^\s*([\w.]+)\s*==\s*(?:'([^']*)'|"([^"]*)"|(true|false|[\d.]+))\s*$/.exec(conditional) : null;
      if (simple) {
        tab.conditionalParentLabel = simple[1];
        tab.conditionalParentValue = simple[4] === 'true' ? 'on' : (simple[2] ?? simple[3] ?? simple[4]);
      } else if (conditional) problems.push(`"${el.dataset.name ?? kind}": its condition "${conditional}" is not one field == value; resolve it before sending`);
      if (kind === 'initials' && el.dataset.eachPage === 'true') {
        // Fixed in each page's corner in print (Margin.css): the viewport is the page's content box, so
        // its box is where it prints on every page. One initial-here tab per page.
        const r = el.getBoundingClientRect();
        const pt = (v: number) => Math.round((v * PT) / PX);
        for (let n = 1; n <= starts.length; n += 1) {
          (tabs[type] ??= []).push({ ...tab, pageNumber: String(n), xPosition: String(pt(MARGIN + r.left)), yPosition: String(pt(MARGIN + r.top)), width: String(pt(r.width)), height: String(pt(r.height)) });
        }
        continue;
      }
      if (kind === 'radio-group') {
        tab.groupName = el.dataset.name;
        tab.radios = [...el.querySelectorAll('input[type="radio"]')].map((r) => ({ value: (r as HTMLInputElement).value, ...placeOf(r) }));
        delete tab.tabLabel;
      }
      (tabs[type] ??= []).push(tab);
    }
    for (const out of doc.querySelectorAll<HTMLElement>('output[data-doc="computed"]')) {
      const signer = byRole.values().next().value;
      if (signer) (signer.formulaTabs ??= []).push({ tabLabel: out.dataset.name, formula: out.dataset.formula, ...placeOf(out) });
    }
    return { documentType: doc.dataset.type, pages: starts.length, recipients, problems };
  });
  const json = JSON.stringify(envelope, null, 2);
  if (out) writeFileSync(out, json);
  else console.log(json);
} finally {
  await close();
}
