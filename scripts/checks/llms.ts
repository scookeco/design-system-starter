/**
 * llms.txt and llms-full.txt (the llmstxt.org convention), rendered from the agent manifest.
 *
 *   llms.txt       H1 name, blockquote summary, the agent rules, then H2 link lists (Guides,
 *                  Foundations, Components, Primitives, Layouts, Utilities, Examples), one line each.
 *   llms-full.txt  the same, then every unit's API and usage doc, the types, every guide flattened
 *                  to Markdown, and the semantic tokens.
 *
 * Pure: scripts/manifest.ts writes the files, tests/unit/manifest.test.ts checks them.
 */
import { MANIFEST_FILE, SCHEMA_FILE, type ClosedApi, type ExportEntry, type ExportKind, type Manifest, type PropInfo, type Usage } from './manifest.ts';

export const LLMS_FILE = 'llms.txt';
export const LLMS_FULL_FILE = 'llms-full.txt';
/** llms.txt is read whole at the start of an agent session: keep it small. Raise deliberately, like a bundle budget. */
export const LLMS_BUDGET_BYTES = 16384;


/** First sentence, cut at a word boundary to about `max` characters. */
export const oneLine = (text: string | null, max = 90): string => {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  const sentence = /^(.+?[.!?])(\s|$)/.exec(flat)?.[1] ?? flat;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
};

/**
 * A unit's line in llms.txt: its first clause, about `max` characters (a little over is kept whole).
 * Agents choose a component from these lines, so a short phrase beats a truncated sentence:
 *   1. the first sentence, if it fits;
 *   2. else without its parentheticals;
 *   3. else cut at the longest clause break that fits (; — , :). A comma inside a list after a colon
 *      only counts once the kept list has two items, so "a tile: label" never survives alone;
 *   4. else at a word, with an ellipsis.
 */
export const firstClause = (text: string | null, max = 60): string => {
  if (!text) return '';
  const slack = max + 8;
  const sentence = oneLine(text, Number.MAX_SAFE_INTEGER).replace(/\.$/, '');
  if (sentence.length <= slack) return sentence;
  const bare = sentence.replace(/\s+\([^()]*\)/g, '').replace(/\s+([,:;])/g, '$1');
  if (bare.length <= slack) return bare;
  let best = '';
  for (const m of bare.matchAll(/;| —|,|:/g)) {
    const at = m.index;
    if (at < 10 || at > max) continue;
    const kept = bare.slice(0, at);
    const colon = kept.lastIndexOf(':');
    if (m[0] === ',' && colon !== -1 && !kept.slice(colon).includes(',')) continue;
    if (kept.length > best.length) best = kept;
  }
  if (best) return best.trim();
  const head = bare.slice(0, max + 1);
  return `${head.slice(0, head.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
};

const link = (title: string, path: string, note: string) => `- [${title}](${path})${note ? `: ${note}` : ''}`;

const SECTIONS: { title: string; kind: ExportKind }[] = [
  { title: 'Components', kind: 'component' },
  { title: 'Primitives', kind: 'primitive' },
  { title: 'Layouts', kind: 'layout' },
  { title: 'Utilities', kind: 'utility' },
];

/** Units get one line each; parts (TableRow, CardHeader) are reached through their parent's doc. */
const listed = (m: Manifest, kind: ExportKind) => m.exports.filter((e) => e.kind === kind && !e.partOf);

/** llms.txt (llmstxt.org): H1, blockquote summary, prose (the rules), then H2 link lists. */
export const renderLlms = (m: Manifest): string => {
  const out: string[] = [
    `# ${m.name}`,
    '',
    `> ${m.summary}`,
    '',
    `Import only from \`${m.entry}\`. Every export's props, variants, stories, tokens and usage rules: [${MANIFEST_FILE}](${MANIFEST_FILE}) ([schema](${SCHEMA_FILE})). Every usage doc and guide in full: [${LLMS_FULL_FILE}](${LLMS_FULL_FILE}). Rules for all UI work:`,
    '',
    '```text',
    m.rules,
    '```',
  ];
  const section = (title: string, lines: string[]) => {
    if (lines.length) out.push('', `## ${title}`, '', ...lines);
  };
  section('Guides', m.guides.map((g) => link(g.title, g.path, oneLine(g.summary, 70))));
  section('Foundations', m.foundations.map((g) => link(g.title, g.path, oneLine(g.summary, 70))));
  // Agents choose a unit from these lines: every one gets its first clause.
  for (const { title, kind } of SECTIONS) section(title, listed(m, kind).map((e) => link(e.name, e.docs ?? e.source, firstClause(e.description))));
  // The rules block already maps each archetype to its example; the title is enough here.
  section('Examples', m.examples.map((x) => link(x.title, x.path, '')));
  return `${out.join('\n')}\n`;
};

const code = (text: string) => `\`${text.replace(/`/g, "'")}\``;

const propLine = (p: PropInfo) => {
  const head = `${code(`${p.name}${p.required ? '' : '?'}: ${p.type}`)}${p.default !== null ? ` = ${code(p.default)}` : ''}`;
  const notes = [p.description, p.deprecated ? `Deprecated: ${p.deprecated}` : null].filter(Boolean).join(' ');
  return `- ${head}${notes ? `: ${notes}` : ''}`;
};

const closedLine = (c: ClosedApi | undefined) =>
  !c
    ? []
    : [`Closed styling API: ${c.className || c.style ? 'ACCEPTS className/style (a defect)' : 'no `className`/`style`'}${c.UNSAFE_className ? '; `UNSAFE_className`/`UNSAFE_style` escape hatches (need a reasoned lint disable)' : ''}.`];

const propsBlock = (e: ExportEntry): string[] => {
  const lines: string[] = [];
  if (e.signature) lines.push(`Signature: ${code(e.signature)}`);
  if (e.props) {
    if (e.props.length) lines.push('', 'Props:', ...e.props.map(propLine));
    if (e.inherits?.length) lines.push(`- …plus the native attributes of ${e.inherits.map(code).join(', ')}.`);
    lines.push('', ...closedLine(e.closedApi));
  }
  return lines;
};

const usageBlock = (u: Usage): string[] => [
  '',
  '**When to use**',
  '',
  ...u.whenToUse.map((w) => `- ${w}`),
  '',
  '**When not to use**',
  '',
  ...u.whenNotToUse.map((w) => `- ${w.situation} → ${w.instead}`),
  '',
  `**Do:** ${u.do.caption}`,
  '',
  '```tsx',
  u.do.code,
  '```',
  '',
  `**Don't:** ${u.dont.caption}`,
  '',
  '```tsx',
  u.dont.code,
  '```',
  '',
  '**Accessibility**',
  '',
  ...u.accessibility.map((a) => `- ${a}`),
];

const unitBlock = (m: Manifest, e: ExportEntry): string[] => {
  const lines = [`### ${e.name}`, '', `${e.kind} · \`${e.source}\`${e.docs ? ` · usage: \`${e.docs}\`` : ''}${e.status ? ` · status: ${e.status}` : ''}`];
  if (e.description && e.description !== e.usage?.whenToUse[0]) lines.push('', e.description);
  lines.push(...propsBlock(e));
  const variants = Object.entries(e.variants ?? {});
  if (variants.length) lines.push('', `Variants: ${variants.map(([k, v]) => `${k} (${v.join(' | ')})`).join('; ')}.`);
  if (e.states?.length) lines.push(`States: ${e.states.join(', ')}.`);
  for (const part of m.exports.filter((p) => p.partOf === e.name && p.kind !== 'type-only')) {
    lines.push('', `#### ${part.name}`, '', `${part.kind}, part of ${e.name}${part.description ? `. ${part.description}` : '.'}`, ...propsBlock(part));
  }
  if (e.usage) lines.push(...usageBlock(e.usage));
  if (e.stories) lines.push('', `Stories: ${e.stories.map((st) => code(st.id)).join(', ')}.`);
  if (e.unit) {
    lines.push('', `Stories: ${e.unit.stories.map((s) => code(s.id)).join(', ') || 'none'}.`);
    if (e.unit.composes.length) lines.push(`Composes: ${e.unit.composes.join(', ')}.`);
    lines.push(`Tokens read: ${e.unit.tokens.map(code).join(', ') || 'none'}.`);
  }
  return ['', ...lines];
};

/** llms-full.txt: llms.txt, then every unit's API and usage doc, the types, the guides and the semantic tokens. */
export const renderLlmsFull = (m: Manifest, guideMarkdown: ReadonlyMap<string, string>): string => {
  const out: string[] = [renderLlms(m).trimEnd()];
  for (const { title, kind } of SECTIONS) {
    const units = listed(m, kind);
    if (!units.length) continue;
    out.push('', `## ${title} reference`);
    for (const e of units) out.push(...unitBlock(m, e));
  }
  const types = m.exports.filter((e) => e.kind === 'type-only' && !e.propsOf);
  if (types.length) {
    out.push('', '## Types', '');
    for (const t of types) out.push(`- ${code(t.name)} (\`${t.source}\`): ${t.definition ? code(t.definition) : ''}${t.description ? ` ${t.description}` : ''}`);
  }
  out.push('', '## Guides in full');
  for (const g of m.guides) {
    const md = guideMarkdown.get(g.path);
    if (md) out.push('', `<!-- ${g.path} -->`, '', md);
  }
  const semantic = Object.entries(m.tokens).filter(([, t]) => t.tier === 'semantic');
  out.push('', '## Semantic tokens', '', 'Path, CSS custom property, value (and dark value), what it is for. Look up component-tier tokens and alias chains in the manifest.', '');
  for (const [path, t] of semantic) {
    const modes = Object.entries(t.modes)
      .map(([mode, v]) => `${mode} ${code(v)}`)
      .join(', ');
    out.push(`- ${code(path)} ${code(`var(${t.cssVar})`)}: ${code(t.value)}${modes ? ` (${modes})` : ''}${t.description ? `. ${t.description}` : ''}`);
  }
  return `${out.join('\n')}\n`;
};
