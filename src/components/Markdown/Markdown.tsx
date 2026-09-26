import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { Link } from '../Link/Link';
import './Markdown.css';

/*
 * Internal: a small Markdown renderer for model output, used by StreamingText (and so by Message).
 * Not exported from the public entry.
 *
 * Model output is untrusted input, so this builds React elements and nothing else:
 *   - no dangerouslySetInnerHTML anywhere: raw HTML in the source (<script>, <img onerror>) is text;
 *   - links only for http(s), mailto, same-page (#) and app-relative (/path) URLs, through Link;
 *     anything else (javascript:, data:, protocol-relative //host) renders as its text, unlinked;
 *   - no images at all: an image URL the model wrote would load on render, a channel for leaking
 *     what's on screen to whoever controls that URL;
 *   - headings are demoted to bold paragraphs, so an answer can't rewrite the page's outline.
 *
 * It re-parses on every token, so partial input must render sensibly: an unclosed fence is a code
 * block so far, an unmatched ** or ` is literal text until its closer arrives.
 *
 * Supported: paragraphs, # headings, - and 1. lists, > quotes, ``` fences, `code`, **bold**,
 * *italic* / _italic_, [text](url) and numbered citations [1].
 */

export interface MarkdownOptions {
  /** Renders a numbered citation ([1]). Without it, citations stay as literal text. */
  citation?: ((number: number) => ReactNode) | undefined;
  /** Accessible name for code blocks ("Code from the answer"). */
  codeLabel?: string | undefined;
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'title'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; code: string };

const FENCE = /^\s*```\s*([\w+-]*)\s*$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

/** Split the source into blocks. Pure, so it's unit-tested on partial and hostile input. */
export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      i += 1;
      // An unclosed fence (still streaming) runs to the end: it's a code block so far.
      while (i < lines.length && !FENCE.test(lines[i] ?? '')) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({ kind: 'code', language: fence[1] ?? '', code: code.join('\n') });
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'title', text: heading[1] ?? '' });
      continue;
    }
    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === 'quote' && paragraph.length === 0 && i > 0 && QUOTE.test(lines[i - 1] ?? '')) last.text += ` ${quote[1] ?? ''}`;
      else blocks.push({ kind: 'quote', text: quote[1] ?? '' });
      continue;
    }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const item = bullet ?? ordered;
    if (item) {
      flush();
      const isOrdered = ordered !== null;
      const last = blocks.at(-1);
      const previous = lines[i - 1] ?? '';
      if (last?.kind === 'list' && last.ordered === isOrdered && (BULLET.test(previous) || ORDERED.test(previous))) last.items.push(item[1] ?? '');
      else blocks.push({ kind: 'list', ordered: isOrdered, items: [item[1] ?? ''] });
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

/** http(s), mailto, same-page and app-relative URLs only. Everything else is shown as text. */
export const safeHref = (url: string): string | undefined => {
  const href = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  if (href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//'))) return href;
  return undefined;
};

/** Inline spans: code, bold, italic, links and citations. An unmatched marker is literal text. */
export function renderInline(text: string, options: MarkdownOptions = {}, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = '';
  let i = 0;
  const push = (node: ReactNode) => {
    if (plain) out.push(plain);
    plain = '';
    out.push(<Fragment key={`${keyPrefix}-${String(out.length)}`}>{node}</Fragment>);
  };
  while (i < text.length) {
    const rest = text.slice(i);
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      push(<code className="markdown__code">{code[1]}</code>);
      i += code[0].length;
      continue;
    }
    const bold = /^\*\*(.+?)\*\*/.exec(rest);
    if (bold) {
      push(<strong>{renderInline(bold[1] ?? '', options, `${keyPrefix}b${String(i)}`)}</strong>);
      i += bold[0].length;
      continue;
    }
    const italic = /^(\*|_)([^*_\s][^*_]*?)\1(?![\w*])/.exec(rest);
    if (italic) {
      push(<em>{renderInline(italic[2] ?? '', options, `${keyPrefix}e${String(i)}`)}</em>);
      i += italic[0].length;
      continue;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      const href = safeHref(link[2] ?? '');
      push(href ? <Link href={href}>{renderInline(link[1] ?? '', options, `${keyPrefix}l${String(i)}`)}</Link> : link[1]);
      i += link[0].length;
      continue;
    }
    const citation = /^\[(\d{1,2})\](?!\()/.exec(rest);
    if (citation && options.citation) {
      push(options.citation(Number(citation[1])));
      i += citation[0].length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  if (plain) out.push(plain);
  return out;
}

/** Plain text for a screen-reader announcement: the words, without the Markdown syntax or citation numbers. */
export const toSpeech = (source: string): string =>
  source
    .replace(/```[\w+-]*\n?/g, ' ')
    .replace(/\[(\d{1,2})\](?!\()/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export interface MarkdownProps extends MarkdownOptions {
  source: string;
  /** Rendered after the last block's text (StreamingText's caret). */
  trailing?: ReactNode;
}

/** Internal: Markdown source as React elements, safely. */
export function Markdown({ source, trailing, citation, codeLabel = 'Code' }: MarkdownProps) {
  const blocks = parseBlocks(source);
  const options = { citation, codeLabel };
  const last = blocks.length - 1;
  return (
    <div className="markdown">
      {blocks.map((block, index) => {
        const key = `b${String(index)}`;
        const tail = index === last ? trailing : null;
        switch (block.kind) {
          case 'code':
            return (
              <Fragment key={key}>
                <CodeBlock code={block.code || ' '} label={codeLabel} {...(block.language ? { language: block.language } : {})} />
                {tail}
              </Fragment>
            );
          case 'title':
            return (
              <p key={key} className="markdown__heading">
                <strong>{renderInline(block.text, options, key)}</strong>
                {tail}
              </p>
            );
          case 'quote':
            return (
              <blockquote key={key} className="markdown__quote">
                {renderInline(block.text, options, key)}
                {tail}
              </blockquote>
            );
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={key} className="markdown__list">
                {block.items.map((item, n) => (
                  <li key={n}>
                    {renderInline(item, options, `${key}-${String(n)}`)}
                    {n === block.items.length - 1 ? tail : null}
                  </li>
                ))}
              </List>
            );
          }
          default:
            return (
              <p key={key} className="markdown__paragraph">
                {renderInline(block.text, options, key)}
                {tail}
              </p>
            );
        }
      })}
      {blocks.length === 0 ? trailing : null}
    </div>
  );
}
