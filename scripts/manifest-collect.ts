/**
 * Collect the facts the agent manifest is built from. Runs inside Vite (scripts/manifest.ts loads it
 * with ssrLoadModule; Vitest imports it directly), because the usage docs and guides are TSX: they are
 * imported and rendered, not parsed by hand.
 *
 *   exports     the TypeScript compiler API over src/index.ts: every public export, its kind, JSDoc,
 *               props (type text, required, default, description, literal values)
 *   stories     every *.stories.tsx under docs/ and src/, indexed by Storybook's own CSF parser
 *   usage       docs/usage/*.usage.tsx, imported; `covers` matched by identity against the entry
 *   guides      docs/guides and docs/foundations pages, rendered to static HTML
 *   units       src/tokens/token-usage.json (tokens read, composition)
 *   tokens      the token source, through the same model the token checks use
 *   rules       the marked block in CLAUDE.md; commands from README.md's Scripts table
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadCsf } from 'storybook/internal/csf-tools';
import ts from 'typescript';
import { extractAgentRules } from './checks/agent-rules.ts';
import { htmlToMarkdown, pageHeading } from './checks/html-markdown.ts';
import type { ExampleEntry, ExportFacts, Literal, ManifestInputs, PageEntry, PropInfo, StoryFileFacts, TokenEntry, UnitFacts, UsageFacts } from './checks/manifest.ts';
import { loadTokenSource } from './checks/token-source.ts';
import { tokenInfo } from './checks/token-usage.ts';
import type { UsageDoc } from '../docs/usage/types.ts';

const posix = (p: string) => p.split(sep).join('/');
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
/** Type text from the checker can name modules by absolute path: never let one into the repo. */
const cleanType = (text: string) => flat(text.replace(/import\("[^"]*"\)\./g, ''));

const REACT_DOM_TYPES = `${sep}node_modules${sep}@types${sep}react${sep}`;
const inReactTypes = (d: ts.Declaration) => d.getSourceFile().fileName.split('/').join(sep).includes(REACT_DOM_TYPES);
const inNodeModules = (d: ts.Declaration) => /[\\/]node_modules[\\/]/.test(d.getSourceFile().fileName);
const ESCAPE_HATCHES = new Set(['UNSAFE_className', 'UNSAFE_style']);

// ---------------------------------------------------------------------------------------------
// Exports: the TypeScript compiler API

const literalValues = (type: ts.Type, node: ts.TypeNode | undefined): Literal[] | undefined => {
  const members = type.isUnion() ? type.types : [type];
  if (!members.every((t) => t.isStringLiteral() || t.isNumberLiteral())) return undefined;
  if (!type.isUnion()) return undefined;
  // Prefer the order the union is written in (sm | md | lg), from the annotation or the alias.
  const aliasDecl = type.aliasSymbol?.declarations?.[0];
  const unionNode = node && ts.isUnionTypeNode(node) ? node : aliasDecl && ts.isTypeAliasDeclaration(aliasDecl) && ts.isUnionTypeNode(aliasDecl.type) ? aliasDecl.type : undefined;
  if (unionNode?.types.every((t) => ts.isLiteralTypeNode(t) && (ts.isStringLiteral(t.literal) || ts.isNumericLiteral(t.literal)))) {
    return unionNode.types.map((t) => {
      const lit = (t as ts.LiteralTypeNode).literal;
      return ts.isNumericLiteral(lit) ? Number(lit.text) : (lit as ts.StringLiteral).text;
    });
  }
  return members.map((t) => (t as ts.LiteralType).value as Literal);
};

const isBoolean = (type: ts.Type) =>
  (type.flags & ts.TypeFlags.Boolean) !== 0 || (type.isUnion() && type.types.every((t) => (t.flags & ts.TypeFlags.BooleanLiteral) !== 0));

const docText = (symbol: ts.Symbol, checker: ts.TypeChecker) => flat(ts.displayPartsToString(symbol.getDocumentationComment(checker))) || null;

const statusOf = (symbol: ts.Symbol, checker: ts.TypeChecker): string | null => {
  const tags = symbol.getJsDocTags(checker);
  const status = tags.find((t) => t.name === 'status');
  if (status) return flat(ts.displayPartsToString(status.text)) || null;
  return tags.some((t) => t.name === 'deprecated') ? 'deprecated' : null;
};

const defaultsOf = (param: ts.ParameterDeclaration): Map<string, string> => {
  const out = new Map<string, string>();
  if (ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) if (el.initializer && !el.dotDotDotToken) out.set((el.propertyName ?? el.name).getText(), flat(el.initializer.getText()));
  }
  return out;
};

const propsOf = (checker: ts.TypeChecker, param: ts.ParameterDeclaration) => {
  const type = checker.getTypeAtLocation(param);
  const defaults = defaultsOf(param);
  const inherits = new Set<string>();
  const props: PropInfo[] = [];
  const all = checker.getPropertiesOfType(type);
  const names = new Set(all.map((p) => p.name));
  for (const p of all) {
    const decls = p.declarations ?? [];
    // React's DOM, ARIA and event attributes: hundreds of them, so name the interfaces instead.
    if (decls.length > 0 && decls.every(inReactTypes)) {
      for (const d of decls) if (ts.isInterfaceDeclaration(d.parent)) inherits.add(d.parent.name.text);
      continue;
    }
    if (ESCAPE_HATCHES.has(p.name)) continue;
    // An intersection can declare a prop twice (DOM children and the component's own): prefer ours.
    const decl = decls.find((d) => !inNodeModules(d)) ?? decls[0];
    const propType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(p, param));
    const annotation = decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl)) && !inNodeModules(decl) ? decl.type : undefined;
    const typeText = annotation ? flat(annotation.getText()) : cleanType(checker.typeToString(propType, param, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope));
    const info: PropInfo = {
      name: p.name,
      type: isBoolean(propType) && !annotation ? 'boolean' : typeText,
      required: (p.flags & ts.SymbolFlags.Optional) === 0,
      default: defaults.get(p.name) ?? null,
      description: docText(p, checker),
    };
    const values = literalValues(propType, annotation);
    if (values) info.values = values;
    const deprecated = p.getJsDocTags(checker).find((t) => t.name === 'deprecated');
    if (deprecated) info.deprecated = flat(ts.displayPartsToString(deprecated.text)) || 'yes';
    props.push(info);
  }
  return {
    props,
    inherits: [...inherits].sort(byName),
    closedApi: { className: names.has('className'), style: names.has('style'), UNSAFE_className: names.has('UNSAFE_className'), UNSAFE_style: names.has('UNSAFE_style') },
    propsType: param.type && ts.isTypeReferenceNode(param.type) ? param.type.typeName.getText() : undefined,
  };
};

const printer = ts.createPrinter({ removeComments: true });

/** Every export of src/index.ts, as the TypeScript program sees it. */
export const collectExports = (root: string, entry = 'src/index.ts'): ExportFacts[] => {
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile).config, ts.sys, root);
  const entryFile = join(root, entry);
  const program = ts.createProgram({ rootNames: [entryFile], options: parsed.options });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entryFile);
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`Cannot read the exports of ${entry}`);

  return checker.getExportsOfModule(moduleSymbol).map((exported): ExportFacts => {
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (!decl) throw new Error(`${exported.name}: no declaration`);
    const isValue = (symbol.flags & ts.SymbolFlags.Value) !== 0;
    const fnLike =
      ts.isFunctionDeclaration(decl) || (ts.isVariableDeclaration(decl) && !!decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)));
    const facts: ExportFacts = {
      name: exported.name,
      source: posix(relative(root, decl.getSourceFile().fileName)),
      isValue,
      declaration: fnLike ? 'function' : ts.isVariableDeclaration(decl) ? 'variable' : ts.isTypeAliasDeclaration(decl) ? 'type' : ts.isInterfaceDeclaration(decl) ? 'interface' : ts.isClassDeclaration(decl) ? 'class' : 'other',
      description: docText(symbol, checker),
      status: statusOf(symbol, checker),
    };
    if (isValue && fnLike) {
      const signature = checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(symbol, decl), ts.SignatureKind.Call)[0];
      const param = signature?.getParameters()[0]?.valueDeclaration;
      if (/^[A-Z]/.test(exported.name)) {
        if (param && ts.isParameter(param)) Object.assign(facts, propsOf(checker, param));
        else Object.assign(facts, { props: [], inherits: [] });
      } else if (signature) {
        facts.signature = cleanType(checker.signatureToString(signature, decl, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.WriteArrowStyleSignature));
      }
    }
    if (!isValue && (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl))) {
      facts.definition = flat(printer.printNode(ts.EmitHint.Unspecified, decl, decl.getSourceFile()).replace(/^export\s+/, '')).replace(/;$/, '');
      if (ts.isTypeAliasDeclaration(decl)) {
        const values = literalValues(checker.getDeclaredTypeOfSymbol(symbol), decl.type);
        if (values) facts.values = values;
      }
    }
    return facts;
  });
};

// ---------------------------------------------------------------------------------------------
// Stories: Storybook's CSF parser, so ids match the gallery's exactly

const storyFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? storyFiles(full) : /\.stories\.tsx?$/.test(entry) ? [full] : [];
  });

export const collectStories = (root: string): StoryFileFacts[] =>
  ['docs', 'src']
    .flatMap((d) => storyFiles(join(root, d)))
    .map((full) => {
      const file = posix(relative(root, full));
      const csf = loadCsf(readFileSync(full, 'utf8'), { fileName: file, makeTitle: (t?: string) => t ?? file }).parse();
      const metaTags = csf.meta.tags ?? [];
      return {
        file,
        title: csf.meta.title ?? file,
        stories: csf.stories.map((s) => ({ id: s.id, name: s.name ?? s.id, tags: [...metaTags, ...(s.tags ?? [])] })),
      };
    })
    .sort((a, b) => byName(a.file, b.file));

// ---------------------------------------------------------------------------------------------
// Usage docs: imported, with the do/don't source read from the file

const dedent = (text: string) => {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)?.[0].length ?? 0));
  return lines.map((l) => l.slice(indent)).join('\n');
};

/** The source of `do.render` and `dont.render` in a usage doc. */
export const exampleCode = (file: string, code: string): { do: string; dont: string } => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && ['do', 'dont'].includes(node.name.getText()) && ts.isObjectLiteralExpression(node.initializer)) {
      const render = node.initializer.properties.find((p) => p.name?.getText() === 'render');
      if (render && ts.isPropertyAssignment(render) && ts.isArrowFunction(render.initializer)) {
        const body = render.initializer.body;
        const inner = ts.isParenthesizedExpression(body) ? body.expression : body;
        found[node.name.getText()] = dedent(`${' '.repeat(ts.getLineAndCharacterOfPosition(sf, inner.getStart()).character)}${inner.getText()}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (found.do === undefined || found.dont === undefined) throw new Error(`${file}: do.render and dont.render must be arrow functions`);
  return { do: found.do, dont: found.dont };
};

export const collectUsage = (root: string, docs: ReadonlyMap<string, UsageDoc>, api: Record<string, unknown>): UsageFacts[] => {
  const names = new Map<unknown, string>();
  for (const [name, value] of Object.entries(api)) if (!names.has(value)) names.set(value, name);
  return [...docs]
    .sort(([a], [b]) => byName(a, b))
    .map(([name, doc]) => {
      const path = `docs/usage/${name}.usage.tsx`;
      const code = exampleCode(path, readFileSync(join(root, path), 'utf8'));
      return {
        name,
        path,
        covers: doc.covers.map((c) => names.get(c) ?? '(not a public export)'),
        whenToUse: [...doc.whenToUse],
        whenNotToUse: doc.whenNotToUse.map(({ situation, instead }) => ({ situation, instead })),
        do: { caption: doc.do.caption, code: code.do },
        dont: { caption: doc.dont.caption, code: code.dont },
        accessibility: [...doc.accessibility],
      };
    });
};

// ---------------------------------------------------------------------------------------------
// Guides and Foundations: rendered, the way the gallery shows them

type StoryModule = Record<string, unknown>;
type Loader = () => Promise<StoryModule>;

const renderPage = (file: string, mod: StoryModule): string => {
  const story = Object.entries(mod).find(([key, value]) => key !== 'default' && typeof (value as { render?: unknown } | undefined)?.render === 'function')?.[1] as
    | { render: (args: object, context: object) => ReturnType<typeof createElement> }
    | undefined;
  if (!story) throw new Error(`${file}: a Guides or Foundations page needs a story with a render function`);
  return renderToStaticMarkup(createElement(() => story.render({}, {})));
};

/** The gallery's sidebar order (storySort in .storybook/preview.tsx) for one section, read from its AST. */
export const sidebarOrder = (previewCode: string, section: string): string[] => {
  const sf = ts.createSourceFile('preview.tsx', previewCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let order: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'order' && ts.isArrayLiteralExpression(node.initializer)) {
      const items = node.initializer.elements;
      const at = items.findIndex((e) => ts.isStringLiteral(e) && e.text === section);
      const next = items[at + 1];
      if (at >= 0 && next && ts.isArrayLiteralExpression(next)) order = next.elements.filter(ts.isStringLiteral).map((e) => e.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return order;
};

export const collectPages = async (
  root: string,
  loaders: Record<string, Loader>,
  stories: StoryFileFacts[],
  section: 'Guides' | 'Foundations',
): Promise<{ pages: PageEntry[]; markdown: Map<string, string> }> => {
  const order = sidebarOrder(readFileSync(join(root, '.storybook/preview.tsx'), 'utf8'), section);
  const fileOfStory = new Map(stories.flatMap((f) => f.stories.map((s) => [s.id, f.file] as const)));
  const href = (h: string) => {
    const story = /^\.\/\?path=\/(?:story|docs)\/([\w-]+)/.exec(h)?.[1];
    // A golden example links to its source, not its stories.
    if (story) return fileOfStory.get(story)?.replace(/^(src\/examples\/.+)\.stories\.tsx$/, "$1.tsx");
    return /^https?:/.test(h) ? h : undefined;
  };
  const files = stories.filter((f) => f.title.startsWith(`${section}/`));
  const pages: { page: PageEntry; rank: number }[] = [];
  const markdown = new Map<string, string>();
  for (const f of files) {
    const loader = loaders[`../${f.file}`];
    if (!loader) throw new Error(`${f.file}: not found by the collector's import.meta.glob`);
    const html = renderPage(f.file, await loader());
    const { title, lead } = pageHeading(html);
    const name = f.title.split('/').at(-1) ?? f.title;
    const rank = order.indexOf(name);
    pages.push({ page: { title: title || name, summary: lead, path: f.file, story: f.stories[0]?.id ?? '' }, rank: rank === -1 ? order.length : rank });
    if (section === 'Guides') markdown.set(f.file, htmlToMarkdown(html, { headingShift: 2, href }));
  }
  pages.sort((a, b) => a.rank - b.rank || byName(a.page.title, b.page.title));
  return { pages: pages.map((p) => p.page), markdown };
};

// ---------------------------------------------------------------------------------------------
// Examples, README, CLAUDE.md, tokens

/** The golden example's header comment, first paragraph, without the "GOLDEN EXAMPLE:" label. */
export const headerSummary = (code: string): string => {
  const comment = /^\s*\/\*\*([\s\S]*?)\*\//.exec(code)?.[1] ?? '';
  const lines = comment.split('\n').map((l) => l.replace(/^\s*\* ?/, ''));
  const firstPara = lines.join('\n').trim().split(/\n\s*\n/)[0] ?? '';
  return flat(firstPara.replace(/^GOLDEN EXAMPLES?:\s*/i, '')).replace(/^./, (c) => c.toUpperCase());
};

export const collectExamples = (root: string, stories: StoryFileFacts[]): ExampleEntry[] =>
  stories
    .filter((f) => f.title.startsWith('Examples/'))
    .map((f) => {
      // The example beside its stories file (ListPage.stories.tsx → ListPage.tsx), else the stories file itself.
      const beside = f.file.replace(/\.stories\.tsx?$/, '.tsx');
      const path = existsSync(join(root, beside)) ? beside : f.file;
      return { title: f.title.split('/').at(-1) ?? f.title, summary: headerSummary(readFileSync(join(root, path), 'utf8')), path, stories: f.stories.map((s) => s.id) };
    })
    .sort((a, b) => byName(a.path, b.path));

/** README.md's Scripts table: | `npm run x` | what it does | */
export const readmeCommands = (readme: string): { command: string; description: string }[] => {
  const section = readme.split(/^## Scripts\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  return [...section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)].map((m) => ({ command: m[1] ?? '', description: m[2] ?? '' }));
};

/** Every semantic and component token, plus any other token a unit reads. */
export const collectTokens = (root: string, read: Iterable<string>): Record<string, TokenEntry> => {
  const tokens = loadTokenSource(join(root, 'tokens'));
  const wanted = new Set(read);
  const out: Record<string, TokenEntry> = {};
  for (const path of [...tokens.keys()].sort(byName)) {
    const token = tokens.get(path);
    if (!token || (token.tier === 'primitive' && !wanted.has(path))) continue;
    const info = tokenInfo(tokens, path);
    out[path] = {
      cssVar: info.cssVar,
      tier: info.tier,
      type: info.type,
      description: info.description,
      value: info.value,
      chain: info.chain,
      modes: Object.fromEntries(Object.entries(info.modes).map(([mode, v]) => [mode, v.value])),
    };
  }
  return out;
};

// ---------------------------------------------------------------------------------------------

const pageLoaders = import.meta.glob<StoryModule>(['../docs/guides/*.stories.tsx', '../docs/foundations/*.stories.tsx']);

export interface Collected {
  inputs: ManifestInputs;
  /** Guide path → the guide flattened to Markdown, for llms-full.txt. */
  guideMarkdown: Map<string, string>;
}

/** Everything the manifest and llms files are built from. */
export const collect = async (root: string): Promise<Collected> => {
  const [{ usageDocs }, api] = await Promise.all([import('../docs/usage/registry.ts'), import('../src/index.ts')]);
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { description?: string };
  const usageMap = JSON.parse(readFileSync(join(root, 'src/tokens/token-usage.json'), 'utf8')) as { units: Record<string, UnitFacts> };
  const stories = collectStories(root);
  const guides = await collectPages(root, pageLoaders, stories, 'Guides');
  const foundations = await collectPages(root, pageLoaders, stories, 'Foundations');
  return {
    inputs: {
      name: /^# (.+)$/m.exec(readme)?.[1] ?? 'Design system',
      summary: pkg.description ?? '',
      rules: extractAgentRules(readFileSync(join(root, 'CLAUDE.md'), 'utf8')),
      commands: readmeCommands(readme),
      exports: collectExports(root),
      units: usageMap.units,
      stories,
      usage: collectUsage(root, usageDocs, api as Record<string, unknown>),
      guides: guides.pages,
      foundations: foundations.pages,
      examples: collectExamples(root, stories),
      tokens: collectTokens(root, Object.values(usageMap.units).flatMap((u) => u.tokens.map((t) => t.token))),
    },
    guideMarkdown: guides.markdown,
  };
};
