/**
 * Which stories can a change affect? The engine behind `npm run test:visual:changed`
 * (scripts/test-visual-changed.ts); tested by tests/unit/affected-stories.test.ts.
 *
 * 1. A module graph of everything the gallery loads, built from the source with TypeScript's parser
 *    and module resolution: static imports and re-exports, literal `import()` (the lazy routes, the
 *    lazy Docs page), `import.meta.glob` (expanded against the tree), `?raw` imports (CLAUDE.md, the
 *    stylesheets Foundations reads), JSON, and CSS `@import`. It reaches outside src/: Foundations
 *    import scripts/checks/* and glob tokens/**, Guides/Agents imports CLAUDE.md, and the Playwright
 *    helpers import the mock seed.
 * 2. Barrels are followed by name. `import { Badge } from '../../src/index'` reaches Badge and what
 *    Badge imports, not every module src/index.ts re-exports. That is what the bundler keeps too: the
 *    tree-shaking check (npm run size) proves importing one export pulls in only the units it
 *    composes, and system stylesheets only style their own blocks (tests/unit/affected-stories.test.ts).
 * 3. A story file is affected when its closure contains a changed file. A Docs tab adds the Docs page
 *    frame (.storybook/DocsPage.tsx) and its own usage doc: the frame's registry globs every usage
 *    doc, but a tab renders only the one named after its title.
 * 4. Some changes reach every story: whatever .storybook/preview.tsx loads statically, whatever the
 *    Playwright specs and config load (the seed sets every story's frozen clock), and a fixed list
 *    (tokens, global styles, Storybook config, dependencies, build config). Those run everything.
 * 5. A changed file the graph doesn't reach and that isn't on the known non-visual list is
 *    "unclassified", and runs everything too: a missed story is worse than a slow run.
 */
import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import { dirname, matchesGlob, posix, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const ROOT = resolve(import.meta.dirname, '..');

/** Repo-relative, forward slashes. */
const rel = (root: string, abs: string) => relative(root, abs).split(sep).join('/');

// ---------------------------------------------------------------------------------------------
// Parsing one module

/** What an importer asks of a module: named exports, or all of it ('*': a namespace, `import()`, a glob). */
export type Want = '*' | ReadonlySet<string>;

export interface ImportEdge {
  to: string;
  /** Names imported. An empty set is a side-effect import (the module body runs, nothing is read). */
  want: Want;
  kind: 'static' | 'dynamic' | 'glob';
}

export interface ReExport {
  to: string;
  /** exported name → imported name, or '*' for `export * from`. */
  names: ReadonlyMap<string, string> | '*';
}

export interface ModuleInfo {
  file: string;
  imports: ImportEdge[];
  reexports: ReExport[];
  /**
   * Only imports, re-exports and types: importing one name from it runs nothing of its own worth
   * following, so names are followed through it one by one.
   */
  barrel: boolean;
  /** Glob patterns this module expands (absolute from the repo root), to map deleted files back to it. */
  globs: string[];
  /** Imports that can't be resolved statically. Any of these makes the graph unsafe: run everything. */
  problems: string[];
}

const SCRIPT = /\.(?:[cm]?[jt]sx?)$/;

const COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  resolveJsonModule: true,
  jsx: ts.JsxEmit.ReactJSX,
  noEmit: true,
};

/** Relative and root-absolute specifiers resolve into the repo; bare ones are packages (the lockfile covers them). */
const isLocal = (specifier: string) => specifier.startsWith('.') || specifier.startsWith('/');

export class ModuleGraph {
  readonly root: string;
  private readonly modules = new Map<string, ModuleInfo>();
  private readonly resolutionCache: ts.ModuleResolutionCache;

  constructor(root = ROOT) {
    this.root = root;
    this.resolutionCache = ts.createModuleResolutionCache(root, (f) => f, COMPILER_OPTIONS);
  }

  /** Does this repo file exist? */
  exists(file: string) {
    return existsSync(resolve(this.root, file));
  }

  private read(file: string) {
    return readFileSync(resolve(this.root, file), 'utf8');
  }

  /** Resolve an import specifier from a repo file to a repo file, or null for a package. Throws when unresolvable. */
  resolveSpecifier(from: string, specifier: string): string | null {
    const path = specifier.replace(/[?#].*$/, '');
    if (!isLocal(path)) return null;
    const abs = path.startsWith('/') ? resolve(this.root, `.${path}`) : resolve(this.root, dirname(from), path);
    if (existsSync(abs) && statSync(abs).isFile()) return rel(this.root, abs);
    const resolved = ts.resolveModuleName(path, resolve(this.root, from), COMPILER_OPTIONS, ts.sys, this.resolutionCache).resolvedModule;
    if (!resolved) throw new Error(`cannot resolve "${specifier}"`);
    const target = rel(this.root, resolved.resolvedFileName);
    if (target.startsWith('..') || target.includes('node_modules/')) return null;
    return target;
  }

  /** Expand an import.meta.glob pattern list relative to a module. */
  private expandGlob(from: string, patterns: string[]): { files: string[]; absolute: string[] } {
    const toRoot = (p: string) => (p.startsWith('/') ? p.slice(1) : posix.normalize(posix.join(posix.dirname(from), p)));
    const positive = patterns.filter((p) => !p.startsWith('!')).map(toRoot);
    const negative = patterns.filter((p) => p.startsWith('!')).map((p) => toRoot(p.slice(1)));
    const found = new Set<string>();
    for (const pattern of positive) {
      for (const f of globSync(pattern, { cwd: this.root })) found.add(f.split(sep).join('/'));
    }
    const files = [...found].filter((f) => !negative.some((n) => matchesGlob(f, n))).sort();
    return { files, absolute: positive };
  }

  /** Parse a module (cached). Non-script files (CSS, JSON, Markdown, SVG) are leaves, except CSS @import. */
  info(file: string): ModuleInfo {
    const cached = this.modules.get(file);
    if (cached) return cached;
    const info: ModuleInfo = { file, imports: [], reexports: [], barrel: false, globs: [], problems: [] };
    this.modules.set(file, info);
    const edge = (specifier: string, want: Want, kind: ImportEdge['kind']) => {
      try {
        const to = this.resolveSpecifier(file, specifier);
        if (to) info.imports.push({ to, want, kind });
      } catch (error) {
        info.problems.push(`${file}: ${(error as Error).message}`);
      }
    };
    if (file.endsWith('.css')) {
      for (const m of this.read(file).matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) edge(m[1] ?? '', '*', 'static');
      return info;
    }
    if (!SCRIPT.test(file)) return info;

    const source = ts.createSourceFile(file, this.read(file), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let barrel = true;
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        if (clause?.isTypeOnly) continue;
        const names = new Set<string>();
        let namespace = false;
        if (clause?.name) names.add('default');
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) namespace = true;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) if (!el.isTypeOnly) names.add((el.propertyName ?? el.name).text);
        }
        // `import { type A } from './x'` keeps a bare import under verbatimModuleSyntax: a side-effect edge.
        edge(statement.moduleSpecifier.text, namespace ? '*' : names, 'static');
        if (names.size > 0 || namespace) barrel = false;
        continue;
      }
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        if (statement.isTypeOnly) continue;
        const clause = statement.exportClause;
        let names: ReadonlyMap<string, string> | '*' = '*';
        if (clause && ts.isNamedExports(clause)) {
          names = new Map(clause.elements.filter((el) => !el.isTypeOnly).map((el) => [el.name.text, (el.propertyName ?? el.name).text]));
          if (names.size === 0) continue;
        } else if (clause) {
          barrel = false; // export * as ns from: a namespace object
          edge(statement.moduleSpecifier.text, '*', 'static');
          continue;
        }
        try {
          const to = this.resolveSpecifier(file, statement.moduleSpecifier.text);
          if (to) info.reexports.push({ to, names });
        } catch (error) {
          info.problems.push(`${file}: ${(error as Error).message}`);
        }
        continue;
      }
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
      if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
      barrel = false;
    }
    info.barrel = barrel;

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const [arg] = node.arguments;
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (arg && ts.isStringLiteralLike(arg)) edge(arg.text, '*', 'dynamic');
          else info.problems.push(`${file}: import() of a computed specifier`);
        } else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'glob' && ts.isMetaProperty(node.expression.expression)) {
          const patterns = arg && ts.isStringLiteralLike(arg) ? [arg.text] : arg && ts.isArrayLiteralExpression(arg) && arg.elements.every(ts.isStringLiteralLike) ? arg.elements.map((e) => (e as ts.StringLiteralLike).text) : undefined;
          if (!patterns) info.problems.push(`${file}: import.meta.glob with a computed pattern`);
          else {
            const { files, absolute } = this.expandGlob(file, patterns);
            info.globs.push(...absolute);
            for (const f of files) if (f !== file) info.imports.push({ to: f, want: '*', kind: 'glob' });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return info;
  }

  private readonly exportCache = new Map<string, ReadonlySet<string> | '*'>();

  /** Names a module exports through its re-exports, for routing `export *`. '*' when it defines exports itself. */
  exportedNames(file: string, seen = new Set<string>()): ReadonlySet<string> | '*' {
    const cached = this.exportCache.get(file);
    if (cached) return cached;
    const info = this.info(file);
    if (!info.barrel) return '*';
    if (seen.has(file)) return new Set();
    seen.add(file);
    const names = new Set<string>();
    for (const r of info.reexports) {
      if (r.names === '*') {
        const inner = this.exportedNames(r.to, seen);
        if (inner === '*') {
          this.exportCache.set(file, '*');
          return '*';
        }
        for (const n of inner) if (n !== 'default') names.add(n);
      } else for (const n of r.names.keys()) names.add(n);
    }
    this.exportCache.set(file, names);
    return names;
  }

  /** Does `file` (through its re-exports) provide `name`? Unknown for non-barrels: assume yes. */
  private provides(file: string, name: string): boolean {
    const names = this.exportedNames(file);
    return names === '*' || names.has(name);
  }

  /**
   * Every file a module reaches, following names through barrels. `follow` can drop edges
   * (the static closure of preview.tsx drops its lazy import; a Docs tab keeps one usage doc of the glob).
   */
  closure(start: string, want: Want = '*', follow: (from: string, e: ImportEdge) => boolean = () => true): Set<string> {
    const reached = new Set<string>();
    /** Per module: whether its body was followed, and which names were routed through it. */
    const bodyDone = new Set<string>();
    const namesDone = new Map<string, Set<string> | '*'>();
    const queue: [string, Want][] = [[start, want]];
    while (queue.length > 0) {
      const [file, asked] = queue.pop() as [string, Want];
      reached.add(file);
      const info = this.info(file);
      // The body: everything that isn't a re-export. A barrel's body is only its side-effect imports.
      if (!bodyDone.has(file)) {
        bodyDone.add(file);
        for (const e of info.imports) {
          if (follow(file, e)) queue.push([e.to, e.want]);
        }
      }
      // Re-exports: only the names asked for. A non-barrel (or a '*' ask) follows all of them.
      const done = namesDone.get(file) ?? new Set<string>();
      if (done === '*') continue;
      if (asked === '*' || !info.barrel) {
        namesDone.set(file, '*');
        for (const r of info.reexports) queue.push([r.to, r.names === '*' ? '*' : new Set(r.names.values())]);
        continue;
      }
      for (const name of asked) {
        if (done.has(name)) continue;
        done.add(name);
        let routed = false;
        for (const r of info.reexports) {
          if (r.names === '*') {
            if (name !== 'default' && this.provides(r.to, name)) {
              queue.push([r.to, new Set([name])]);
              routed = true;
            }
          } else {
            const inner = r.names.get(name);
            if (inner !== undefined) {
              queue.push([r.to, new Set([inner])]);
              routed = true;
            }
          }
        }
        // A name we can't place (a typo, or a type): follow every re-export rather than guess.
        if (!routed) for (const r of info.reexports) queue.push([r.to, '*']);
      }
      namesDone.set(file, done);
    }
    return reached;
  }

  /** Every module parsed so far. */
  parsed(): ModuleInfo[] {
    return [...this.modules.values()];
  }
}

// ---------------------------------------------------------------------------------------------
// The gallery: roots, global triggers, and classifying changed files

/** The story globs from .storybook/main.ts, relative to the repo root. */
export const storyGlobs = async (root = ROOT): Promise<string[]> => {
  const config = (await import(resolve(root, '.storybook/main.ts'))) as { default: { stories: string[] } };
  return config.default.stories.map((p) => posix.normalize(posix.join('.storybook', p)));
};

export const storyFiles = (globs: readonly string[], root = ROOT): string[] =>
  [...new Set(globs.flatMap((g) => globSync(g, { cwd: root }).map((f) => f.split(sep).join('/'))))].sort();

/** Changes that reach every story whatever the graph says, with the reason printed in the plan. */
export const EVERYTHING: readonly { pattern: string; reason: string }[] = [
  { pattern: 'tokens/**', reason: 'tokens feed tokens.css, which every story loads' },
  { pattern: 'src/styles/**', reason: 'global styles (layer order, reset, tokens.css) load in every story' },
  { pattern: '.storybook/**', reason: 'Storybook config, preview decorators and the Docs page frame wrap every story' },
  { pattern: 'playwright.config.ts', reason: 'the Playwright config runs every test' },
  { pattern: 'tests/visual/**', reason: 'the visual specs, their helpers and the WCAG 2.2 fixtures run every test' },
  { pattern: 'package.json', reason: 'dependencies and scripts can change any story' },
  { pattern: 'package-lock.json', reason: 'dependency versions can change any story' },
  { pattern: '.nvmrc', reason: 'the Node version builds the gallery' },
  { pattern: 'tsconfig.json', reason: 'the compiler settings build every story' },
  { pattern: 'vite.config.ts', reason: "Storybook's Vite builder merges the root Vite config" },
];

/**
 * Changes that can't change a pixel or an axe result, when the graph doesn't reach them.
 * Anything else the graph doesn't reach is unclassified and runs everything.
 */
export const NON_VISUAL: readonly string[] = [
  'tests/unit/**',
  'fixtures/**',
  'scripts/**', // a script the gallery imports (scripts/checks/*) is in the graph, so it never lands here
  '.github/**',
  '**/*.md', // CLAUDE.md is in the graph (Guides/Agents imports it)
  'llms.txt',
  'llms-full.txt',
  'design-system.manifest.json',
  'design-system.manifest.schema.json',
  'eslint.config.js',
  'stylelint.config.mjs',
  'vitest.config.ts',
  '.size-limit.json',
  '.gitignore',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  // The app entry: its page, its build config and its static files (MSW's worker). The gallery
  // loads none of them (its own worker is in .storybook/public); src/main.tsx and src/bootstrap.tsx
  // are gallery-shaped source nothing in the gallery imports.
  'index.html',
  'vite.app.config.ts',
  'public/**',
];

/** Gallery source: if the graph doesn't reach one of these, nothing the gallery loads imports it. */
const UNREACHED_SOURCE: readonly string[] = ['{src,docs}/**/*.{ts,tsx,css,json}'];

/** A committed baseline: tests/visual/__screenshots__/<platform>/<story id>--<theme>.png. */
const BASELINE = /^tests\/visual\/__screenshots__\/[^/]+\/(.+)--(?:light|dark)\.png$/;

export interface Gallery {
  graph: ModuleGraph;
  stories: string[];
  /** File → why changing it runs everything (derived closures). */
  global: Map<string, string>;
  /** The Docs page frame, with the usage-doc glob dropped (added back per tab). */
  docsFrame: Set<string>;
  /** Every file the gallery and the specs reach (for "is the build stale?" and classification). */
  reachable: Set<string>;
}

const DOCS_PAGE = '.storybook/DocsPage.tsx';
const PREVIEW = '.storybook/preview.tsx';
const USAGE_REGISTRY = 'docs/usage/registry.ts';
const SPEC_ROOTS = ['playwright.config.ts', 'tests/visual/storybook.ts', 'tests/visual/stories.spec.ts', 'tests/visual/wcag22.spec.ts', 'tests/visual/wcag22-checks.ts', '.storybook/main.ts'];

/** Drop the usage-doc glob of the Docs page registry (a tab renders one, re-added by name). */
const withoutUsageGlob = (from: string, e: ImportEdge) => !(from === USAGE_REGISTRY && e.kind === 'glob');

export const loadGallery = (stories: readonly string[], root = ROOT, graph = new ModuleGraph(root)): Gallery => {
  const global = new Map<string, string>();
  const mark = (files: Iterable<string>, reason: string) => {
    for (const f of files) if (!global.has(f)) global.set(f, reason);
  };
  // What preview.tsx loads statically wraps every story; its lazy import is the Docs page.
  mark(graph.closure(PREVIEW, '*', (from, e) => !(from === PREVIEW && e.kind === 'dynamic')), 'loaded by every story through .storybook/preview.tsx');
  for (const spec of SPEC_ROOTS) if (graph.exists(spec)) mark(graph.closure(spec), `loaded by ${spec}, which runs every test`);
  const docsFrame = graph.closure(DOCS_PAGE, '*', withoutUsageGlob);
  const reachable = new Set<string>([...global.keys(), ...docsFrame, ...graph.closure(DOCS_PAGE)]);
  for (const s of stories) for (const f of graph.closure(s)) reachable.add(f);
  return { graph, stories: [...stories], global, docsFrame, reachable };
};

/** The usage doc a Docs tab renders: docs/usage/<last title segment>.usage.tsx (docs/usage/registry.ts). */
export const usageDocFor = (title: string) => `docs/usage/${title.split('/').at(-1) ?? ''}.usage.tsx`;

export interface Classified {
  /** Why this change runs everything, or undefined. */
  everything?: { file: string; reason: string };
  /** Changed files that reach every story. */
  global: string[];
  /** Changed files that feed the graph (mapped to stories). */
  graphed: string[];
  /** Story ids named directly (a committed baseline changed). */
  baselines: string[];
  /** Changed files that can't affect the gallery. */
  ignored: string[];
  /** Graph problems: unresolved imports, computed import() or glob patterns. */
  problems: string[];
}

/**
 * Sort changed files. `deleted` files no longer exist: their importers changed with them, except a
 * glob's, so a deleted file a glob matched counts as a change to the module that globs it.
 */
export const classify = (gallery: Gallery, changed: readonly string[], deleted: ReadonlySet<string> = new Set()): Classified => {
  const out: Classified = { global: [], graphed: [], baselines: [], ignored: [], problems: [] };
  const globbers = gallery.graph.parsed().filter((m) => m.globs.length > 0);
  for (const m of gallery.graph.parsed()) out.problems.push(...m.problems);
  if (out.problems.length > 0) out.everything = { file: out.problems[0] ?? '', reason: 'the import graph has an import it cannot resolve' };
  for (const file of changed) {
    const baseline = BASELINE.exec(file);
    if (baseline) {
      out.baselines.push(baseline[1] ?? '');
      continue;
    }
    const rule = EVERYTHING.find((r) => matchesGlob(file, r.pattern));
    const derived = gallery.global.get(file);
    if (rule ?? derived) {
      out.global.push(file);
      if (!out.everything) out.everything = { file, reason: rule?.reason ?? derived ?? '' };
      continue;
    }
    if (gallery.reachable.has(file)) {
      out.graphed.push(file);
      continue;
    }
    if (deleted.has(file)) {
      const owner = globbers.find((m) => m.globs.some((g) => matchesGlob(file, g)));
      if (owner) out.graphed.push(owner.file);
      else out.ignored.push(file);
      continue;
    }
    // Gallery source nothing imports (a new module not wired in yet): no story can see it. A new story
    // file is a root, and a new import.meta.glob is parsed where it's written, so neither lands here.
    if (UNREACHED_SOURCE.some((p) => matchesGlob(file, p)) || NON_VISUAL.some((p) => matchesGlob(file, p))) {
      out.ignored.push(file);
      continue;
    }
    // Not reached, not known to be harmless: a new kind of input. Run everything rather than guess.
    out.global.push(file);
    if (!out.everything) out.everything = { file, reason: 'unclassified: nothing in the gallery imports it and it is not on the non-visual list' };
  }
  return out;
};

export interface IndexEntry {
  id: string;
  type: 'story' | 'docs';
  title: string;
  name: string;
  importPath: string;
  tags?: string[];
  storiesImports?: string[];
}

export interface Affected {
  /** Story file → the changed files it reaches. */
  files: Map<string, string[]>;
  /** Index entries to run (stories and Docs tabs). */
  entries: IndexEntry[];
}

const normalizeImportPath = (p: string) => p.replace(/^\.\//, '');

/** Map changed files to story files and index entries. */
export const affectedEntries = (gallery: Gallery, changed: readonly string[], entries: readonly IndexEntry[], baselines: readonly string[] = []): Affected => {
  const set = new Set(changed);
  const hits = (closure: Iterable<string>) => [...closure].filter((f) => set.has(f));
  const files = new Map<string, string[]>();
  const closures = new Map<string, Set<string>>();
  const closureOf = (file: string) => {
    let c = closures.get(file);
    if (!c) closures.set(file, (c = gallery.graph.closure(file)));
    return c;
  };
  for (const s of gallery.stories) {
    const h = hits(closureOf(s));
    if (h.length > 0) files.set(s, h);
  }
  const frameHits = hits(gallery.docsFrame);
  const picked: IndexEntry[] = [];
  /** Story files whose Docs tab alone is affected (through the frame or the usage doc). */
  const docsOnly = new Map<string, string[]>();
  for (const e of entries) {
    const csf = [e.importPath, ...(e.storiesImports ?? [])].map(normalizeImportPath);
    if (baselines.includes(e.id) || csf.some((f) => files.has(f))) {
      picked.push(e);
      continue;
    }
    if (e.type !== 'docs') continue;
    const usage = usageDocFor(e.title);
    const usageHits = gallery.graph.exists(usage) ? hits(closureOf(usage)) : [];
    if (frameHits.length > 0 || usageHits.length > 0) {
      picked.push(e);
      docsOnly.set(normalizeImportPath(e.importPath), [...new Set([...frameHits, ...usageHits])]);
    }
  }
  for (const [f, h] of docsOnly) if (!files.has(f)) files.set(f, h);
  return { files, entries: picked };
};

// ---------------------------------------------------------------------------------------------
// The guarantees the name-precise graph relies on

/** Split on a top-level separator (outside parentheses and brackets). */
const splitTopLevel = (text: string, separator: RegExp): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? '';
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    else if (depth === 0 && separator.test(ch)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
};

/** Every selector of a stylesheet, outside @keyframes. */
export const selectorsOf = (css: string): string[] => {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors: string[] = [];
  let start = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === ';' || ch === '}') start = i + 1;
    else if (ch === '{') {
      const prelude = src.slice(start, i).trim();
      start = i + 1;
      if (prelude.startsWith('@keyframes')) {
        // Skip the whole @keyframes block: its "selectors" are from, to and percentages.
        let depth = 1;
        while (depth > 0 && i < src.length - 1) {
          i += 1;
          if (src[i] === '{') depth += 1;
          if (src[i] === '}') depth -= 1;
        }
        start = i + 1;
      } else if (!prelude.startsWith('@') && prelude) selectors.push(...splitTopLevel(prelude, /,/));
    }
  }
  return selectors;
};

const blockOf = (cls: string) => cls.replace(/(__|--).*$/, '');
const classesIn = (selector: string) => [...selector.matchAll(/\.(-?[a-z_][\w-]*)/gi)].map((m) => m[1] ?? '');

/**
 * CSS scope, which lets the graph follow barrels by name: a stylesheet is loaded on pages that
 * don't render its component (a barrel's unused re-exports keep their CSS imports; the Docs page
 * frame loads every usage doc), so a change to it may only matter where its component renders.
 *
 * 1. Each block (`.badge`, `.badge__icon`, `.badge--x`) is owned by the one system stylesheet whose
 *    selectors start with it.
 * 2. Every selector in a stylesheet names a block it owns, so it only matches inside (or on) an
 *    element carrying that block's classes.
 * 3. Every module that renders a block's class (in `cx(…)` or `className`) reaches the owning
 *    stylesheet in its closure, so any story rendering the element loads the stylesheet on purpose.
 */
export const cssScopeProblems = (graph: ModuleGraph, stylesheets: readonly string[], modules: readonly string[]): string[] => {
  const problems: string[] = [];
  const owner = new Map<string, string>();
  const selectors = new Map<string, string[]>();
  for (const file of stylesheets) {
    const list = selectorsOf(readFileSync(resolve(graph.root, file), 'utf8'));
    selectors.set(file, list);
    for (const selector of list) {
      // The leftmost compound, without what its pseudo-classes nest (:has(…), :is(…)).
      const leftmost = (splitTopLevel(selector, /[\s>+~]/)[0] ?? '').replace(/\([^()]*(?:\([^()]*\)[^()]*)*\)/g, '');
      for (const block of new Set(classesIn(leftmost).map(blockOf))) {
        const other = owner.get(block);
        if (other && other !== file) problems.push(`${file}: block "${block}" is already styled at the top level by ${other}`);
        else owner.set(block, file);
      }
    }
  }
  // Global names belong to one stylesheet. Keyframes apply wherever they're named, so a stylesheet
  // may only use its own (another sheet's change, or load order, would reach it otherwise). A
  // container name only matches on an element its owner styles, so using another's is fine
  // (AssistantPanel queries AppShell's), but two sheets may not define the same one.
  const GLOBAL_NAMES: readonly [RegExp, RegExp][] = [
    [/@keyframes\s+([\w-]+)/g, /animation(?:-name)?\s*:\s*([^;}]+)/g],
    [/container(?:-name)?\s*:\s*([a-z][\w-]*)(?=\s*[/;])/g, /(?!)/g],
    [/@property\s+(--[\w-]+)/g, /(?!)/g],
  ];
  const definedIn = new Map<string, string>();
  for (const file of stylesheets) {
    const css = readFileSync(resolve(graph.root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [define, use] of GLOBAL_NAMES) {
      const own = new Set([...css.matchAll(define)].map((m) => m[1] ?? ''));
      for (const name of own) {
        const other = definedIn.get(name);
        if (other && other !== file) problems.push(`${file}: "${name}" is also defined by ${other}`);
        definedIn.set(name, file);
      }
      for (const m of css.matchAll(use)) {
        for (const name of (m[1] ?? '').split(/[\s,]+/).filter((n) => /^[a-z][\w-]*$/.test(n) && !own.has(n) && !['none', 'infinite', 'linear', 'alternate', 'both', 'forwards', 'backwards', 'reverse', 'paused', 'running', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'normal'].includes(n))) {
          problems.push(`${file}: uses "${name}", which it doesn't define`);
        }
      }
    }
  }
  for (const [file, list] of selectors) {
    for (const selector of list) {
      if (!classesIn(selector).some((c) => owner.get(blockOf(c)) === file)) problems.push(`${file}: "${selector}" names no block this stylesheet owns`);
    }
  }
  for (const file of modules) {
    if (!SCRIPT.test(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(resolve(graph.root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const used = new Set<string>();
    const isClassContext = (node: ts.Node) =>
      (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'cx') || (ts.isJsxAttribute(node) && node.name.getText(source) === 'className');
    const visit = (node: ts.Node, inClass: boolean): void => {
      const here = inClass || isClassContext(node);
      if (here && (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))) {
        const parent = node.parent;
        const compared = ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind);
        if (!compared) for (const token of node.text.split(/\s+/)) if (token) used.add(blockOf(token));
      }
      ts.forEachChild(node, (child) => {
        visit(child, here && !(ts.isJsxAttribute(child) && child.name.getText(source) !== 'className'));
      });
    };
    visit(source, false);
    const needed = [...used].map((b) => [b, owner.get(b)] as const).filter((pair): pair is readonly [string, string] => pair[1] !== undefined);
    if (needed.length === 0) continue;
    const closure = graph.closure(file);
    for (const [block, sheet] of needed) if (!closure.has(sheet)) problems.push(`${file}: renders "${block}" but never imports ${sheet}`);
  }
  return problems;
};

interface StatsModule {
  id: string;
  reasons?: { moduleName: string }[];
}

/** A preview-stats.json id as a repo file, or null (packages, virtual modules). */
const statsFile = (root: string, id: string): string | null => {
  const clean = id.replace(/[?#].*$/, '').replace(/^\0/, '');
  if (clean.includes('node_modules') || clean.includes('virtual:') || !clean.startsWith('./')) return null;
  const file = clean.slice(2);
  return existsSync(resolve(root, file)) ? file : null;
};

/**
 * Compare the graph with the bundler's: every import edge between repo files in Storybook's
 * preview-stats.json (`storybook build --stats-json`) must be an edge here, and every repo module
 * the bundle contains must be reachable here. The graph may have more (CSS @import, which the
 * bundler inlines), never fewer.
 */
export const statsProblems = (gallery: Gallery, stats: { modules: StatsModule[] }) => {
  const problems: string[] = [];
  let edges = 0;
  const root = gallery.graph.root;
  for (const m of stats.modules) {
    const file = statsFile(root, m.id);
    if (!file) continue;
    if (!gallery.reachable.has(file)) problems.push(`${file}: in the bundle, not reached by the graph`);
    for (const reason of m.reasons ?? []) {
      const importer = statsFile(root, reason.moduleName);
      if (!importer) continue;
      edges += 1;
      const info = gallery.graph.info(importer);
      const known = info.imports.some((e) => e.to === file) || info.reexports.some((r) => r.to === file);
      if (!known) problems.push(`${importer} → ${file}: an import the bundler saw and the graph missed`);
    }
  }
  return { problems, edges, modules: stats.modules.length };
};
