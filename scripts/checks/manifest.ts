/**
 * The agent manifest (design-system.manifest.json), llms.txt and llms-full.txt, built from facts the
 * collector (scripts/manifest-collect.ts) reads out of the repo. Pure: no file system, no TypeScript
 * program, so tests/unit/manifest.test.ts can feed it synthetic facts as negative controls.
 *
 * The schema, which documents every field, is design-system.manifest.schema.json.
 */

export type ExportKind = 'component' | 'primitive' | 'layout' | 'utility' | 'type-only';
export type Literal = string | number;

export interface PropInfo {
  name: string;
  /** The type as TypeScript text: the declared annotation where there is one. */
  type: string;
  required: boolean;
  /** The default from the component's parameter destructuring, as source text. */
  default: string | null;
  description: string | null;
  /** The closed set of values, when the type is a union of literals. */
  values?: Literal[];
  deprecated?: string;
}

export interface ClosedApi {
  className: boolean;
  style: boolean;
  UNSAFE_className: boolean;
  UNSAFE_style: boolean;
}

/** What the TypeScript program says about one public export. */
export interface ExportFacts {
  name: string;
  /** Repo-relative file of the declaration. */
  source: string;
  isValue: boolean;
  declaration: 'function' | 'variable' | 'type' | 'interface' | 'class' | 'other';
  description: string | null;
  status: string | null;
  /** Components and hooks: the first parameter's props, own and third-party ones listed. */
  props?: PropInfo[];
  /** React DOM attribute interfaces the props extend (collapsed, not listed one by one). */
  inherits?: string[];
  closedApi?: ClosedApi;
  /** The props type's name, when the parameter is annotated with a named type (ButtonProps). */
  propsType?: string;
  /** Hooks and other functions: the call signature. */
  signature?: string;
  /** Type-only exports: the declaration, comments removed, on one line. */
  definition?: string;
  values?: Literal[];
}

export interface UsageExampleFacts {
  caption: string;
  /** Source of the example's render function. */
  code: string;
}

export interface UsageFacts {
  /** <Name> of docs/usage/<Name>.usage.tsx. */
  name: string;
  path: string;
  /** Export names, matched by identity against the public entry. */
  covers: string[];
  whenToUse: string[];
  whenNotToUse: { situation: string; instead: string }[];
  do: UsageExampleFacts;
  dont: UsageExampleFacts;
  accessibility: string[];
}

export interface StoryFacts {
  id: string;
  name: string;
  tags: string[];
}

export interface StoryFileFacts {
  file: string;
  title: string;
  stories: StoryFacts[];
}

export interface UnitFacts {
  kind: string;
  dir: string;
  composesAll: string[];
  tokens: { token: string }[];
}

export interface PageEntry {
  title: string;
  summary: string;
  path: string;
  story: string;
}

export interface ExampleEntry {
  title: string;
  summary: string;
  path: string;
  stories: string[];
}

export interface TokenEntry {
  cssVar: string;
  tier: string;
  type: string | null;
  description: string | null;
  value: string;
  chain: string[];
  /** Values in other modes: dark (colour scheme), reduced-motion. */
  modes: Record<string, string>;
}

export interface ManifestInputs {
  name: string;
  summary: string;
  rules: string;
  commands: { command: string; description: string }[];
  exports: ExportFacts[];
  /** src/tokens/token-usage.json `units`. */
  units: Record<string, UnitFacts>;
  stories: StoryFileFacts[];
  usage: UsageFacts[];
  guides: PageEntry[];
  foundations: PageEntry[];
  examples: ExampleEntry[];
  tokens: Record<string, TokenEntry>;
}

export interface Usage {
  whenToUse: string[];
  whenNotToUse: { situation: string; instead: string }[];
  do: UsageExampleFacts;
  dont: UsageExampleFacts;
  accessibility: string[];
}

export interface UnitEntry {
  dir: string;
  stories: { id: string; name: string }[];
  /** Every unit reached through composition (token-usage.json composesAll). */
  composes: string[];
  /** Token paths; each one's value and alias chain are in the top-level `tokens`. */
  tokens: string[];
}

export interface ExportEntry {
  name: string;
  kind: ExportKind;
  source: string;
  status: string | null;
  description: string | null;
  partOf?: string;
  propsOf?: string;
  docs?: string;
  signature?: string;
  definition?: string;
  values?: Literal[];
  props?: PropInfo[];
  inherits?: string[];
  closedApi?: ClosedApi;
  variants?: Record<string, Literal[]>;
  states?: string[];
  usage?: Usage;
  /** Stories of an export that documents itself but is not a UI unit (LocaleProvider). */
  stories?: { id: string; name: string }[];
  unit?: UnitEntry;
}

export interface Manifest {
  $schema: string;
  $comment: string;
  name: string;
  summary: string;
  entry: string;
  rules: string;
  commands: { command: string; description: string }[];
  guides: PageEntry[];
  foundations: PageEntry[];
  examples: ExampleEntry[];
  exports: ExportEntry[];
  tokens: Record<string, TokenEntry>;
}

export const MANIFEST_FILE = 'design-system.manifest.json';
export const SCHEMA_FILE = 'design-system.manifest.schema.json';
export const COMMENT = 'Generated by scripts/manifest.ts from src/index.ts (TypeScript), the stories, docs/usage, docs/guides, src/tokens/token-usage.json, the token source, CLAUDE.md and README.md. Do not edit by hand: run npm run manifest.';

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const UNIT_DIR = /^src\/(components|primitives|layouts)\/([^/]+)\//;
const LAYER_KIND: Record<string, ExportKind> = { components: 'component', primitives: 'primitive', layouts: 'layout' };
/** A longer closed set (icon names, element names) is a vocabulary, not a variant: see props[].values. */
export const MAX_VARIANT_VALUES = 12;
const PAGE_PREFIXES = new Set(['Examples', 'Guides', 'Foundations']);

/** Which of the five kinds an export is: by value/type, then by the layer folder it lives in. */
export const classify = (f: Pick<ExportFacts, 'name' | 'source' | 'isValue' | 'declaration'>): ExportKind => {
  if (!f.isValue) return 'type-only';
  if (f.declaration !== 'function' || !/^[A-Z]/.test(f.name)) return 'utility';
  const layer = UNIT_DIR.exec(f.source)?.[1];
  return layer ? (LAYER_KIND[layer] ?? 'utility') : 'utility';
};

/** The unit folder an export lives in (src/components/Table/Table.tsx → Table), if any. */
export const unitOf = (source: string): string | undefined => UNIT_DIR.exec(source)?.[2];

/** Build the manifest. Deterministic: exports sorted by name, keys in a fixed order, no timestamps. */
export const buildManifest = (inputs: ManifestInputs): Manifest => {
  const propsOf = new Map<string, string>();
  for (const f of inputs.exports) if (f.propsType && f.isValue) propsOf.set(f.propsType, f.name);

  const docsFor = new Map<string, UsageFacts>();
  const primaryUsage = new Map<string, UsageFacts>();
  for (const u of inputs.usage) {
    for (const c of u.covers) docsFor.set(c, u);
    const primary = u.covers.includes(u.name) ? u.name : u.covers[0];
    if (primary) primaryUsage.set(primary, u);
  }

  const storiesFor = (unit: string) =>
    inputs.stories
      .filter((s) => s.title.split('/').at(-1) === unit && !PAGE_PREFIXES.has(s.title.split('/')[0] ?? ''))
      .flatMap((s) => s.stories.map(({ id, name }) => ({ id, name })));

  const exports = [...inputs.exports]
    .sort((a, b) => byName(a.name, b.name))
    .map((f): ExportEntry => {
      const kind = classify(f);
      const folder = unitOf(f.source);
      const usage = primaryUsage.get(f.name);
      const doc = docsFor.get(f.name);
      const entry: ExportEntry = {
        name: f.name,
        kind,
        source: f.source,
        status: f.status,
        description: f.description ?? usage?.whenToUse[0] ?? null,
      };
      if (folder && folder !== f.name) entry.partOf = folder;
      const owner = propsOf.get(f.name);
      if (!f.isValue && owner) entry.propsOf = owner;
      if (doc) entry.docs = doc.path;
      if (f.signature) entry.signature = f.signature;
      if (f.definition && !entry.propsOf) entry.definition = f.definition;
      if (f.values) entry.values = f.values;
      if (f.props) {
        entry.props = f.props;
        entry.inherits = f.inherits ?? [];
        if (f.closedApi) entry.closedApi = f.closedApi;
        const variants: Record<string, Literal[]> = {};
        for (const p of f.props) if (p.values && p.values.length > 1 && p.values.length <= MAX_VARIANT_VALUES) variants[p.name] = p.values;
        entry.variants = variants;
        entry.states = f.props.filter((p) => p.type === 'boolean').map((p) => p.name);
      }
      if (usage) {
        entry.usage = { whenToUse: usage.whenToUse, whenNotToUse: usage.whenNotToUse, do: usage.do, dont: usage.dont, accessibility: usage.accessibility };
      }
      const unit = folder === f.name ? inputs.units[f.name] : undefined;
      if (unit && f.isValue) {
        entry.unit = {
          dir: unit.dir,
          stories: storiesFor(f.name),
          composes: unit.composesAll,
          tokens: unit.tokens.map(({ token }) => token),
        };
      }
      if (usage && !entry.unit) {
        const stories = storiesFor(f.name);
        if (stories.length) entry.stories = stories;
      }
      return entry;
    });

  return {
    $schema: `./${SCHEMA_FILE}`,
    $comment: COMMENT,
    name: inputs.name,
    summary: inputs.summary,
    entry: 'src/index.ts',
    rules: inputs.rules,
    commands: inputs.commands,
    guides: inputs.guides,
    foundations: inputs.foundations,
    examples: inputs.examples,
    exports,
    tokens: inputs.tokens,
  };
};

/** The one serialisation used for the committed file and the staleness check. */
export const serialize = (manifest: Manifest): string => `${JSON.stringify(manifest, null, 2)}\n`;

const UNIT_KINDS = new Set<ExportKind>(['component', 'primitive', 'layout']);

/**
 * What an agent would be missing or misled by: public exports absent from the manifest (or listed but
 * not public), components with no stories or no tokens, UI exports with no usage doc, and any
 * component whose props accept className or style.
 */
export const manifestProblems = (manifest: Pick<Manifest, 'exports'>, publicExports: readonly string[]): string[] => {
  const problems: string[] = [];
  const listed = new Set(manifest.exports.map((e) => e.name));
  const expected = new Set(publicExports);
  for (const name of [...expected].sort(byName)) if (!listed.has(name)) problems.push(`${name}: exported from src/index.ts but missing from the manifest`);
  for (const name of [...listed].sort(byName)) if (!expected.has(name)) problems.push(`${name}: in the manifest but not exported from src/index.ts`);
  for (const e of manifest.exports) {
    if (UNIT_KINDS.has(e.kind) && !e.docs) problems.push(`${e.name}: no usage doc covers it`);
    if (e.unit && e.unit.stories.length === 0) problems.push(`${e.name}: no stories (titles ending in /${e.name})`);
    if (e.unit && e.unit.tokens.length === 0) problems.push(`${e.name}: reads no tokens`);
    if (UNIT_KINDS.has(e.kind) && !e.partOf && !e.unit) problems.push(`${e.name}: no entry in src/tokens/token-usage.json`);
    if (e.closedApi?.className || e.closedApi?.style) problems.push(`${e.name}: props accept className or style (use Closed<…>)`);
  }
  return problems;
};

/** Every absolute or machine-specific path that must never reach the public repo. */
export const PATH_LEAK = /import\(|\/Users\/|\/home\/|\/private\/|\/tmp\/|[A-Z]:\\|node_modules\//;
