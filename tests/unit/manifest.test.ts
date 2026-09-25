import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractAgentRules } from '../../scripts/checks/agent-rules';
import { htmlToMarkdown } from '../../scripts/checks/html-markdown';
import { LLMS_BUDGET_BYTES, LLMS_FILE, LLMS_FULL_FILE, renderLlms, renderLlmsFull } from '../../scripts/checks/llms';
import {
  buildManifest,
  classify,
  manifestProblems,
  MANIFEST_FILE,
  PATH_LEAK,
  SCHEMA_FILE,
  serialize,
  type ExportFacts,
  type Manifest,
  type ManifestInputs,
} from '../../scripts/checks/manifest';
import { schemaProblems } from '../../scripts/checks/token-usage';
import { collect, collectExports, readmeCommands, type Collected } from '../../scripts/manifest-collect';
import * as api from '../../src/index';

const root = resolve(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const committed = { manifest: read(MANIFEST_FILE), llms: read(LLMS_FILE), llmsFull: read(LLMS_FULL_FILE) };
const manifest = JSON.parse(committed.manifest) as Manifest;
const schema = JSON.parse(read(SCHEMA_FILE)) as Parameters<typeof schemaProblems>[1];
const entry = (name: string) => {
  const e = manifest.exports.find((x) => x.name === name);
  if (!e) throw new Error(`${name} is not in the manifest`);
  return e;
};

let collected: Collected;
beforeAll(async () => {
  collected = await collect(root);
}, 120_000);

describe('agent manifest and llms files', () => {
  it('are up to date (run "npm run manifest" if this fails)', () => {
    const fresh = buildManifest(collected.inputs);
    const stale = [
      [MANIFEST_FILE, committed.manifest === serialize(fresh)],
      [LLMS_FILE, committed.llms === renderLlms(fresh)],
      [LLMS_FULL_FILE, committed.llmsFull === renderLlmsFull(fresh, collected.guideMarkdown)],
    ].flatMap(([file, ok]) => (ok ? [] : [file]));
    expect(stale, 'Stale. Run "npm run manifest" and commit the result.').toEqual([]);
  });

  it('the manifest matches its schema', () => {
    expect(schemaProblems(manifest, schema)).toEqual([]);
  });

  it('lists every public export and nothing else; every unit has stories, tokens and a usage doc; no props accept className/style', () => {
    // Values from the runtime module (independent of the TypeScript extractor); type-only exports can only come from TypeScript.
    const types = collected.inputs.exports.filter((e) => !e.isValue).map((e) => e.name);
    expect(manifestProblems(manifest, [...Object.keys(api), ...types])).toEqual([]);
  });

  it('classifies units by layer, with enough of each to be meaningful', () => {
    const count = (kind: string) => manifest.exports.filter((e) => e.kind === kind && !e.partOf).length;
    expect(count('component')).toBeGreaterThan(30);
    expect(count('primitive')).toBeGreaterThan(5);
    expect(count('layout')).toBeGreaterThan(3);
    expect(entry('vars').kind).toBe('utility');
    expect(entry('useToast')).toMatchObject({ kind: 'utility', partOf: 'Toast' });
    expect(entry('ButtonProps')).toMatchObject({ kind: 'type-only', propsOf: 'Button' });
    expect(entry('TableRow')).toMatchObject({ kind: 'component', partOf: 'Table', docs: 'docs/usage/Table.usage.tsx' });
  });

  it('reads props from the TypeScript types: own props, defaults, literal values, closed-API facts', () => {
    const button = entry('Button');
    expect(button.props?.find((p) => p.name === 'variant')).toMatchObject({ type: 'ButtonVariant', required: false, default: "'primary'", values: ['primary', 'secondary', 'ghost', 'danger'] });
    expect(button.variants).toMatchObject({ variant: ['primary', 'secondary', 'ghost', 'danger'], size: ['sm', 'md', 'lg'] });
    expect(button.states).toContain('loading');
    expect(button.inherits).toContain('ButtonHTMLAttributes');
    expect(button.closedApi).toEqual({ className: false, style: false, UNSAFE_className: true, UNSAFE_style: true });
    expect(button.props?.map((p) => p.name)).not.toContain('UNSAFE_className');
    // Radix-backed state props are listed one by one, not collapsed into "inherits".
    expect(entry('Checkbox').props?.map((p) => p.name)).toEqual(expect.arrayContaining(['checked', 'onCheckedChange']));
    expect(entry('Stack').props?.find((p) => p.name === 'gap')?.values).toEqual(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']);
  });

  it('links every unit to real stories, tokens that exist and its usage rules', () => {
    for (const e of manifest.exports.filter((x) => x.unit)) {
      expect(e.unit?.stories.length, e.name).toBeGreaterThan(0);
      for (const token of e.unit?.tokens ?? []) expect(manifest.tokens[token], `${e.name} reads ${token}`).toBeDefined();
      expect(e.usage?.whenNotToUse.length, e.name).toBeGreaterThan(0);
      expect(e.usage?.do.code, e.name).toMatch(/^</);
    }
  });

  it.skipIf(!existsSync(join(root, 'storybook-static/index.json')))('story ids match the built Storybook index', () => {
    const index = JSON.parse(read('storybook-static/index.json')) as { entries: Record<string, unknown> };
    const missing = manifest.exports.flatMap((e) => (e.unit?.stories ?? []).map((s) => s.id)).filter((id) => !(id in index.entries));
    expect(missing, 'Story ids missing from storybook-static/index.json. If the local build is old, rebuild it: npm run build-storybook').toEqual([]);
  });

  it('carries the agent rules from CLAUDE.md and commands that exist', () => {
    expect(manifest.rules).toBe(extractAgentRules(read('CLAUDE.md')));
    const scripts = Object.keys((JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts);
    for (const { command } of manifest.commands) expect(scripts, command).toContain(command.replace(/^npm (run )?/, ''));
    expect(manifest.commands.map((c) => c.command)).toEqual(expect.arrayContaining(['npm run manifest', 'npm run manifest:check']));
    expect(Object.values(manifest.tokens).filter((t) => t.tier === 'semantic').length).toBeGreaterThan(50);
  });

  it('never leaks an absolute or machine path', () => {
    for (const [file, text] of Object.entries(committed)) expect(PATH_LEAK.exec(text)?.[0], file).toBeUndefined();
  });

  it(`llms.txt follows llmstxt.org and stays under ${String(LLMS_BUDGET_BYTES)} bytes`, () => {
    const size = Buffer.byteLength(committed.llms);
    expect(
      size,
      `llms.txt is ${String(size)} bytes. It is read whole at the start of every agent session: shorten a summary, or raise LLMS_BUDGET_BYTES in scripts/checks/llms.ts in the change that needs it and say why.`,
    ).toBeLessThanOrEqual(LLMS_BUDGET_BYTES);
    const lines = committed.llms.split('\n');
    expect(lines[0]).toBe(`# ${manifest.name}`);
    expect(lines[2]).toBe(`> ${manifest.summary}`);
    expect(committed.llms).toContain(manifest.rules);
    const sections = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
    expect(sections).toEqual(['Guides', 'Foundations', 'Components', 'Primitives', 'Layouts', 'Utilities', 'Examples']);
    // Between the H2s: only link-list items.
    const body = committed.llms.slice(committed.llms.indexOf('\n## '));
    for (const line of body.split('\n').filter((l) => l && !l.startsWith('## '))) expect(line).toMatch(/^- \[[^\]]+\]\([^)]+\)(: .+)?$/);
  });

  it('every link in llms.txt and llms-full.txt points at a file in the repo', () => {
    for (const text of [committed.llms, committed.llmsFull]) {
      const targets = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? '').filter((t) => !/^https?:/.test(t));
      expect(targets.length).toBeGreaterThan(50);
      expect(targets.filter((t) => !existsSync(join(root, t)))).toEqual([]);
    }
  });

  it('llms-full.txt carries every unit, usage doc and guide', () => {
    for (const e of manifest.exports.filter((x) => x.unit)) expect(committed.llmsFull).toContain(`\n### ${e.name}\n`);
    for (const g of manifest.guides) expect(committed.llmsFull).toContain(`<!-- ${g.path} -->`);
    expect(committed.llmsFull).toContain('**When not to use**');
  });
});

// The extractor over a tiny fixture entry, and synthetic inputs for the pure builder: prove each check can fail.
describe('manifest extractor and checks', () => {
  const fixture = collectExports(join(root, 'fixtures/manifest'));
  const fact = (name: string) => fixture.find((f) => f.name === name) as ExportFacts;

  it('reads props, defaults, literal values, inherited DOM attributes, status and deprecations', () => {
    const widget = fact('Widget');
    expect(widget).toMatchObject({ source: 'src/components/Widget/Widget.tsx', isValue: true, declaration: 'function', status: 'beta', propsType: 'WidgetProps' });
    expect(widget.description).toBe('A widget for the manifest test.');
    expect(widget.props?.map((p) => p.name)).toEqual(['tone', 'label', 'busy', 'loud']);
    expect(widget.props?.[0]).toEqual({ name: 'tone', type: 'WidgetTone', required: false, default: "'calm'", description: 'How loud it is.', values: ['calm', 'loud', 'quiet'] });
    expect(widget.props?.[1]).toMatchObject({ name: 'label', required: true, default: null });
    expect(widget.props?.[3]?.deprecated).toBe('Use tone.');
    expect(widget.inherits).toEqual(expect.arrayContaining(['ButtonHTMLAttributes', 'HTMLAttributes']));
    expect(widget.closedApi).toEqual({ className: false, style: false, UNSAFE_className: true, UNSAFE_style: true });
    expect(fact('WidgetTone')).toMatchObject({ isValue: false, values: ['calm', 'loud', 'quiet'], definition: "type WidgetTone = 'calm' | 'loud' | 'quiet'" });
    expect(fact('useCount').signature).toBe('(count: number) => string');
  });

  it('flags a component whose props accept className and style', () => {
    const leaky = fact('Leaky');
    expect(leaky.closedApi).toMatchObject({ className: true, style: true });
    const m = buildManifest(synthetic({ exports: fixture }));
    expect(manifestProblems(m, fixture.map((f) => f.name))).toEqual(expect.arrayContaining(['Leaky: props accept className or style (use Closed<…>)']));
  });

  it('classifies by value/type, then by layer folder', () => {
    const f = (name: string, source: string, isValue = true, declaration: ExportFacts['declaration'] = 'function') => classify({ name, source, isValue, declaration });
    expect(f('Button', 'src/components/Button/Button.tsx')).toBe('component');
    expect(f('Stack', 'src/primitives/Stack/Stack.tsx')).toBe('primitive');
    expect(f('AppShell', 'src/layouts/AppShell/AppShell.tsx')).toBe('layout');
    expect(f('useToast', 'src/components/Toast/Toast.tsx')).toBe('utility');
    expect(f('LocaleProvider', 'src/format/LocaleProvider.tsx')).toBe('utility');
    expect(f('vars', 'src/tokens/tokens.ts', true, 'variable')).toBe('utility');
    expect(f('ButtonProps', 'src/components/Button/Button.tsx', false, 'type')).toBe('type-only');
  });

  it('detects a missing export, a stray one, and a unit with no stories, tokens or usage doc', () => {
    const m = buildManifest(
      synthetic({
        exports: [unitFacts('Thing'), unitFacts('Bare'), unitFacts('Undocumented')],
        units: { Thing: unitRow('Thing', ['color.fg']), Bare: unitRow('Bare', []), Undocumented: unitRow('Undocumented', ['color.fg']) },
        stories: [{ file: 'src/components/Thing/Thing.stories.tsx', title: 'Components/Thing', stories: [{ id: 'components-thing--default', name: 'Default', tags: [] }] }],
      }),
    );
    expect(manifestProblems(m, ['Thing', 'Bare', 'Undocumented', 'Missing'])).toEqual([
      'Missing: exported from src/index.ts but missing from the manifest',
      'Bare: no stories (titles ending in /Bare)',
      'Bare: reads no tokens',
      'Undocumented: no usage doc covers it',
      'Undocumented: no stories (titles ending in /Undocumented)',
    ]);
    expect(manifestProblems(m, ['Thing', 'Bare'])).toContain('Undocumented: in the manifest but not exported from src/index.ts');
    expect(manifestProblems({ exports: [] }, ['Thing'])).toEqual(['Thing: exported from src/index.ts but missing from the manifest']);
  });

  it('builds parts, props types, variants and the description fallback', () => {
    const m = buildManifest(
      synthetic({
        exports: [
          unitFacts('Thing', { props: [prop('size', ['sm', 'md']), prop('icon', Array.from({ length: 20 }, (_, i) => `i${String(i)}`)), { ...prop('open'), type: 'boolean' }], propsType: 'ThingProps' }),
          unitFacts('ThingPart'),
          { name: 'ThingProps', source: 'src/components/Thing/Thing.tsx', isValue: false, declaration: 'type', description: null, status: null, definition: 'type ThingProps = {}' },
        ],
        units: { Thing: unitRow('Thing', ['color.fg']) },
      }),
    );
    const thing = m.exports.find((e) => e.name === 'Thing');
    expect(thing?.description).toBe('When a thing is needed.');
    expect(thing?.variants).toEqual({ size: ['sm', 'md'] });
    expect(thing?.states).toEqual(['open']);
    expect(thing?.usage?.whenToUse).toEqual(['When a thing is needed.']);
    expect(m.exports.find((e) => e.name === 'ThingPart')).toMatchObject({ partOf: 'Thing', docs: 'docs/usage/Thing.usage.tsx' });
    expect(m.exports.find((e) => e.name === 'ThingPart')?.usage).toBeUndefined();
    expect(m.exports.find((e) => e.name === 'ThingProps')).toMatchObject({ propsOf: 'Thing' });
    expect(m.exports.find((e) => e.name === 'ThingProps')?.definition).toBeUndefined();
  });

  it('extracts the rules block only between its markers', () => {
    const md = (body: string) => `# X\n\n<!-- agent-rules:start -->\n${body}\n<!-- agent-rules:end -->\n`;
    expect(extractAgentRules(md('```text\nrule one\nrule two\n```'))).toBe('rule one\nrule two');
    expect(() => extractAgentRules('```text\nrule\n```')).toThrow(/markers/);
    expect(() => extractAgentRules(md('rule without a fence'))).toThrow(/fenced/);
  });

  it('reads commands from the README Scripts table only', () => {
    const readme = '# X\n\n## Scripts\n\n| Script | What |\n|---|---|\n| `npm run a` | Does a. |\n| `npm test` | Tests. |\n\n## Other\n\n| `npm run b` | Not a script row here. |\n';
    expect(readmeCommands(readme)).toEqual([
      { command: 'npm run a', description: 'Does a.' },
      { command: 'npm test', description: 'Tests.' },
    ]);
  });

  it('flattens rendered pages to Markdown', () => {
    const html =
      '<article><div class="stack"><h1>Title</h1><p>Lead <code>x</code>.</p></div><section><h2>Part</h2><ul><li>One <a href="./?path=/story/a--b">link</a></li><li>Two</li></ul>' +
      '<table><caption>Cap</caption><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1 | 2</td><td><strong>3</strong></td></tr></tbody></table>' +
      '<pre><code>code\n  indented</code></pre><div class="stack"><span>First</span><span>Second</span></div><svg><path d="M0"/></svg></section></article>';
    expect(htmlToMarkdown(html, { headingShift: 2, href: (h) => (h.includes('a--b') ? 'src/A.tsx' : undefined) })).toBe(
      [
        '### Title',
        'Lead `x`.',
        '#### Part',
        '- One [link](src/A.tsx)\n- Two',
        '**Cap**',
        '| A | B |\n|---|---|\n| 1 \\| 2 | **3** |',
        '```\ncode\n  indented\n```',
        'First',
        'Second',
      ].join('\n\n'),
    );
  });
});

// ---------------------------------------------------------------------------------------------

function synthetic(over: Partial<ManifestInputs>): ManifestInputs {
  return {
    name: 'X',
    summary: 'Y',
    rules: 'rules',
    commands: [],
    exports: [],
    units: {},
    stories: [],
    usage: [
      {
        name: 'Thing',
        path: 'docs/usage/Thing.usage.tsx',
        covers: ['Thing', 'ThingPart'],
        whenToUse: ['When a thing is needed.'],
        whenNotToUse: [{ situation: 'Never', instead: 'nothing' }],
        do: { caption: 'Do', code: '<Thing />' },
        dont: { caption: "Don't", code: '<Thing />' },
        accessibility: ['Named.'],
      },
      { name: 'Bare', path: 'docs/usage/Bare.usage.tsx', covers: ['Bare'], whenToUse: [], whenNotToUse: [], do: { caption: '', code: '' }, dont: { caption: '', code: '' }, accessibility: [] },
    ],
    guides: [],
    foundations: [],
    examples: [],
    tokens: { 'color.fg': { cssVar: '--color-fg', tier: 'semantic', type: 'color', description: null, value: '#000', chain: ['color.fg'], modes: {} } },
    ...over,
  };
}

function unitFacts(name: string, over: Partial<ExportFacts> = {}): ExportFacts {
  return {
    name,
    source: `src/components/${name.replace(/Part$/, '')}/${name}.tsx`,
    isValue: true,
    declaration: 'function',
    description: null,
    status: null,
    props: [],
    inherits: [],
    closedApi: { className: false, style: false, UNSAFE_className: true, UNSAFE_style: true },
    ...over,
  };
}

function unitRow(name: string, tokens: string[]) {
  return { kind: 'component', dir: `src/components/${name}`, composesAll: [], tokens: tokens.map((token) => ({ token })) };
}

function prop(name: string, values?: string[]) {
  return { name, type: values ? values.map((v) => `'${v}'`).join(' | ') : 'string', required: false, default: null, description: null, ...(values ? { values } : {}) };
}
