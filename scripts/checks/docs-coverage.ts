/**
 * Docs coverage: every component, layout and primitive exported from the public entry
 * must be covered by a usage doc. Exports are matched by identity, so a renamed or
 * re-exported component can't slip through on its name.
 */

/** PascalCase value exports: components, layouts, primitives and their parts. */
export const componentExports = (entry: Record<string, unknown>): [string, unknown][] =>
  Object.entries(entry).filter(([name, value]) => /^[A-Z]/.test(name) && value !== undefined);

/** Names of component exports that no usage doc lists in its `covers`. */
export const findUndocumentedExports = (entry: Record<string, unknown>, covered: readonly unknown[]): string[] => {
  const documented = new Set(covered);
  return componentExports(entry)
    .filter(([, value]) => !documented.has(value))
    .map(([name]) => name);
};
