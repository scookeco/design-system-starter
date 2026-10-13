/**
 * The document validator: what a rendered Document must hold before it is a template, a form or an
 * envelope. It reads only the DOM (the vocabulary's data-doc attributes), with no imports, so the same
 * function runs in a unit test, in the browser checks (tests/visual) and in the tooling scripts.
 */

export interface DocumentProblems {
  /** Things that make the document wrong: fix them. */
  errors: string[];
  /** Things that are probably wrong. */
  warnings: string[];
}

/** Checks one rendered document (the element holding it, or the document root itself). */
export function validateDocument(container: Element): DocumentProblems {
  // Everything it uses is inside it: it is also run in the page from its source (scripts/document).
  const CAPTURE = ['field', 'checkbox', 'radio-group', 'select', 'attachment', 'signature', 'initials', 'date-signed'];
  const errors: string[] = [];
  const warnings: string[] = [];
  const all = (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)];
  const describe = (el: HTMLElement) => el.dataset.name ?? el.dataset.clause ?? el.dataset.role ?? el.dataset.doc ?? el.tagName.toLowerCase();

  const roots = container.matches('[data-doc="document"]') ? [container as HTMLElement, ...all('[data-doc="document"]')] : all('[data-doc="document"]');
  if (roots.length !== 1) errors.push(`A document has exactly one root: found ${String(roots.length)}.`);
  const root = roots[0];
  if (!root) return { errors, warnings };
  const lifecycle = root.dataset.lifecycle ?? 'generated';

  for (const ref of all('[data-doc="xref"][data-broken]')) errors.push(`Unresolved reference: ${ref.textContent?.trim() ?? ''}.`);
  for (const dup of all('[data-duplicate]')) errors.push(`Defined or used twice: "${describe(dup)}".`);

  const parties = new Map(all('[data-doc="party"]').map((p) => [p.dataset.role ?? '', p.dataset.kind ?? 'signer']));
  const capture = all(CAPTURE.map((kind) => `[data-doc="${kind}"]`).join(', '));
  for (const el of capture) {
    const role = el.dataset.role;
    if (!role) {
      if (lifecycle !== 'generated') errors.push(`Unassigned ${el.dataset.doc ?? 'field'} "${describe(el)}": give it a role, or a fieldset or role region with one.`);
    } else if (parties.size && !parties.has(role)) {
      errors.push(`"${describe(el)}" is for role "${role}", which Parties does not declare.`);
    }
  }
  for (const [role, kind] of parties) {
    if (kind === 'signer' && lifecycle !== 'generated' && !all(`[data-doc="signature"][data-role="${role}"]`).length) warnings.push(`Signer "${role}" has no Signature.`);
  }

  const names = new Map<string, number>();
  for (const el of all('[data-doc="field"][data-name], [data-doc="checkbox"][data-name], [data-doc="radio-group"][data-name], [data-doc="select"][data-name], [data-doc="attachment"][data-name]')) {
    const name = el.dataset.name ?? '';
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  for (const [name, count] of names) if (count > 1) warnings.push(`"${name}" is captured ${String(count)} times: each fillable value has one field.`);

  for (const el of all('[style*="grid-area"]')) {
    if (el.parentElement?.dataset.doc !== 'grid') errors.push(`"${describe(el)}" has an area outside a DocumentGrid.`);
  }

  if (lifecycle !== 'negotiated' && all('ins.change, del.change, .clause[data-change]').length) warnings.push(`Tracked changes in a document that is ${lifecycle}, not negotiated.`);
  return { errors, warnings };
}
