/** Static checks over the stylesheets that lint rules cannot express. */

const VAR_USE = /var\(\s*(--[\w-]+)/g;
const VAR_DECL = /(?:^|[;{\s])(--[\w-]+)\s*:/g;

export const usedCustomProperties = (css: string): Set<string> => new Set([...css.matchAll(VAR_USE)].map((m) => m[1] as string));
export const declaredCustomProperties = (css: string): Set<string> => new Set([...css.matchAll(VAR_DECL)].map((m) => m[1] as string));

/** Custom properties provided at runtime by a vendor primitive, not by our tokens: Radix, and React Aria's popover width. */
export const RUNTIME_PREFIXES = ['--radix-', '--trigger-width'];

/**
 * Every var(--x) used must be declared somewhere: in the generated tokens or as a
 * component-local property. A missing definition fails silently in the browser.
 */
export const findUndefinedVars = (files: { file: string; css: string }[], definitions: Set<string>): string[] => {
  const declared = new Set(definitions);
  for (const { css } of files) for (const name of declaredCustomProperties(css)) declared.add(name);
  const problems: string[] = [];
  for (const { file, css } of files) {
    for (const name of usedCustomProperties(css)) {
      if (!declared.has(name) && !RUNTIME_PREFIXES.some((p) => name.startsWith(p))) problems.push(`${file}: var(${name}) is not defined`);
    }
  }
  return problems;
};

/** Component and primitive styles read semantic or component tokens, never primitives. */
export const findPrimitiveReads = (files: { file: string; css: string }[], primitiveNames: Set<string>): string[] =>
  files.flatMap(({ file, css }) =>
    [...usedCustomProperties(css)].filter((name) => primitiveNames.has(name)).map((name) => `${file}: reads primitive token ${name}`),
  );

const LAYER_STATEMENT = /@layer\s+[\w-]+(\s*,\s*[\w-]+)+\s*;/g;

export const findLayerStatements = (files: { file: string; css: string }[]) =>
  files.flatMap(({ file, css }) => [...css.matchAll(LAYER_STATEMENT)].map((m) => ({ file, statement: m[0] })));

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level blocks of a stylesheet, as the text before each top-level `{` or `;`. */
const topLevelPreludes = (css: string): string[] => {
  const src = stripComments(css);
  const preludes: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') {
      if (depth === 0) preludes.push(src.slice(start, i).trim());
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) start = i + 1;
    } else if (ch === ';' && depth === 0) {
      preludes.push(src.slice(start, i).trim());
      start = i + 1;
    }
  }
  return preludes.filter(Boolean);
};

/** Every rule in a (non-entry) stylesheet must sit inside one of the declared layers. */
export const findUnlayeredRules = (files: { file: string; css: string }[], layers: readonly string[]): string[] =>
  files.flatMap(({ file, css }) =>
    topLevelPreludes(css)
      .filter((prelude) => {
        const match = /^@layer\s+([\w-]+)$/.exec(prelude);
        return !match || !layers.includes(match[1] as string);
      })
      .map((prelude) => `${file}: "${prelude}" is outside a declared layer`),
  );

const QUERY_PRELUDE = /@(media|container)\b([^{;]*)\{/g;
const QUERY_LENGTH = /-?\d*\.?\d+(px|rem|em)\b/g;

/**
 * Media and container queries cannot read var(), and Stylelint's raw-length ban only sees
 * declarations. So every length in a query must equal a breakpoint token's resolved value.
 */
export const findUntokenedQueryLengths = (files: { file: string; css: string }[], breakpoints: Set<string>): string[] =>
  files.flatMap(({ file, css }) =>
    [...stripComments(css).matchAll(QUERY_PRELUDE)].flatMap((query) =>
      [...(query[2] ?? '').matchAll(QUERY_LENGTH)]
        .map((m) => m[0])
        .filter((length) => !breakpoints.has(length))
        .map((length) => `${file}: @${query[1] ?? ''} uses ${length}, which is not a size.breakpoint token value`),
    ),
  );
