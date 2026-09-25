/**
 * Flatten a rendered docs page (static HTML from react-dom/server) to Markdown for llms-full.txt.
 * Handles what the Guides render: headings, paragraphs, lists, tables, code, links, emphasis.
 * Decorative SVG is dropped. Links are passed through `href` so gallery links can become repo paths.
 */
import { JSDOM } from 'jsdom';

const BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'PRE', 'TABLE', 'FIGURE', 'FIGCAPTION', 'DIV', 'ARTICLE', 'SECTION', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE', 'DL', 'DT', 'DD', 'BLOCKQUOTE', 'HR', 'CAPTION']);
const SKIP = new Set(['SVG', 'svg', 'SCRIPT', 'STYLE', 'TEMPLATE']);

export interface MarkdownOptions {
  /** Added to every heading level: 2 turns the page's h1 into ###. */
  headingShift?: number;
  /** Rewrite a link target; return undefined to drop the link and keep its text. */
  href?: (href: string) => string | undefined;
}

const isElement = (n: Node): n is Element => n.nodeType === 1;
const isBlock = (n: Node) => isElement(n) && BLOCK.has(n.tagName);

const parse = (html: string): HTMLElement => new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body;

/** The page's h1 and the lead paragraph that follows it (DocPage's `title` and `lead`). */
export const pageHeading = (html: string): { title: string; lead: string } => {
  const body = parse(html);
  const h1 = body.querySelector('h1');
  const lead = h1?.parentElement?.querySelector('h1 ~ p') ?? body.querySelector('p');
  const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { title: text(h1), lead: text(lead) };
};

export const htmlToMarkdown = (html: string, options: MarkdownOptions = {}): string => {
  const shift = options.headingShift ?? 0;
  const rewrite = options.href ?? ((h: string) => h);

  const inline = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ');
    if (!isElement(node) || SKIP.has(node.tagName)) return '';
    const inner = () => [...node.childNodes].map(inline).join('');
    switch (node.tagName) {
      case 'CODE':
        return `\`${(node.textContent ?? '').replace(/`/g, "'")}\``;
      case 'STRONG':
      case 'B':
        return `**${inner().trim()}**`;
      case 'EM':
      case 'I':
        return `*${inner().trim()}*`;
      case 'BR':
        return '\n';
      case 'A': {
        const target = rewrite(node.getAttribute('href') ?? '');
        const text = inner().trim();
        return target ? `[${text}](${target})` : text;
      }
      default:
        return inner();
    }
  };
  const text = (node: Node) => inline(node).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();

  const list = (el: Element, ordered: boolean): string =>
    [...el.children]
      .filter((li) => li.tagName === 'LI')
      .map((li, i) => {
        const marker = ordered ? `${String(i + 1)}. ` : '- ';
        const body = blocks(li).replace(/\n{2,}/g, '\n');
        return marker + body.split('\n').join(`\n${' '.repeat(marker.length)}`);
      })
      .join('\n');

  const cell = (el: Element) => text(el).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const table = (el: Element): string => {
    const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map(cell));
    const caption = el.querySelector('caption');
    const [head, ...body] = rows;
    if (!head) return '';
    const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.join(' | ')} |`)];
    return [caption ? `**${text(caption)}**` : '', lines.join('\n')].filter(Boolean).join('\n\n');
  };

  const block = (el: Element): string => {
    if (SKIP.has(el.tagName)) return '';
    const h = /^H([1-6])$/.exec(el.tagName);
    if (h) return `${'#'.repeat(Math.min(6, Number(h[1]) + shift))} ${text(el)}`;
    switch (el.tagName) {
      case 'P':
      case 'FIGCAPTION':
      case 'DD':
        return text(el);
      case 'DT':
        return `**${text(el)}**`;
      case 'UL':
        return list(el, false);
      case 'OL':
        return list(el, true);
      case 'PRE':
        return `\`\`\`\n${(el.textContent ?? '').replace(/\n+$/, '')}\n\`\`\``;
      case 'TABLE':
        return table(el);
      case 'CAPTION':
        return '';
      case 'HR':
        return '---';
      case 'BLOCKQUOTE':
        return blocks(el)
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
      default:
        return blocks(el);
    }
  };

  /**
   * A container's children: runs of inline content become paragraphs, blocks convert on their own.
   * A Stack (the system's vertical-flow primitive) lays every child out on its own line, even a span.
   */
  const blocks = (el: Element): string => {
    const vertical = el.classList.contains('stack');
    const out: string[] = [];
    let run: Node[] = [];
    const flush = () => {
      const t = run.map(inline).join('').replace(/[ \t]+/g, ' ').trim();
      if (t) out.push(t);
      run = [];
    };
    for (const child of el.childNodes) {
      if (isBlock(child) || (vertical && isElement(child))) {
        flush();
        const b = block(child as Element);
        if (b) out.push(b);
      } else run.push(child);
    }
    flush();
    return out.join('\n\n');
  };

  return blocks(parse(html)).replace(/\n{3,}/g, '\n\n').trim();
};
