/**
 * The document's data export, from the rendered source alone: every captured value by name (each
 * capture element carries its value in data-value), Repeat rows as lists, and every Computed value.
 * No imports, so it runs in the page too (the tooling scripts evaluate it there).
 */

/** A document's data export: what it is, where it is in its life, and every value by name. */
export interface DocumentExport {
  type: string | null;
  version: string | null;
  lifecycle: string;
  values: Record<string, unknown>;
}

/** Exports a rendered Document (the element holding it, or its root). */
export function exportDocument(container: Element): DocumentExport {
  const root = container.matches('[data-doc="document"]') ? (container as HTMLElement) : container.querySelector<HTMLElement>('[data-doc="document"]');
  const values: Record<string, unknown> = {};
  const write = (path: readonly string[], value: unknown) => {
    let at: Record<string, unknown> = values;
    path.forEach((key, i) => {
      if (i === path.length - 1) {
        at[key] = value;
        return;
      }
      at[key] ??= /^\d+$/.test(path[i + 1] ?? '') ? [] : {};
      at = at[key] as Record<string, unknown>;
    });
  };
  for (const el of (root ?? container).querySelectorAll<HTMLElement>('[data-name][data-value]')) {
    const raw = el.dataset.value ?? '';
    // A computed value is a number or text; everything else is JSON.
    const value: unknown = el.dataset.doc !== 'computed' ? (JSON.parse(raw) as unknown) : raw === '' ? null : Number.isNaN(Number(raw)) ? raw : Number(raw);
    write((el.dataset.name ?? '').split('.'), value);
  }
  return { type: root?.dataset.type ?? null, version: root?.dataset.version ?? null, lifecycle: root?.dataset.lifecycle ?? 'generated', values };
}
