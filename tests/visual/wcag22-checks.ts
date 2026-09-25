/**
 * WCAG 2.2 checks beyond the axe run, executed in the page by tests/visual/wcag22.spec.ts.
 *
 * Each function is passed to page.evaluate(), so it must be self-contained: no imports, no
 * references to anything outside its own body. Each returns a list of violations, one line per
 * offending element, starting with a selector-like description of it.
 */

/** The ids of the checks, as the fixture stories name them in an `expect:<id>` tag. */
export const CHECKS = ['target-size'] as const;
export type CheckId = (typeof CHECKS)[number];

/**
 * SC 2.5.8 Target Size (Minimum), AA. Every pointer target is at least 24×24 CSS px, or passes the
 * spacing exception: a 24px-diameter circle centred on its bounding box intersects no other target
 * and no other undersized target's circle. Targets inside running text (the inline exception) are
 * skipped. Not measured: targets that can't take a pointer (disabled, inert, pointer-events: none,
 * invisible or visually hidden).
 *
 * Measured on the element's own border box. A hit area enlarged only by a pseudo-element or an
 * associated <label> doesn't count here: size the control itself with size.target-min.
 */
export function targetSizeViolations(): string[] {
  const MIN = 24;
  const RADIUS = MIN / 2;
  const TOLERANCE = 0.01;
  const SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    ...['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'slider', 'treeitem'].map(
      (role) => `[role="${role}"]`,
    ),
  ].join(', ');

  const inStorybookChrome = (el: Element) => {
    for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
      if (n.id === 'storybook-docs' || [...n.classList].some((c) => c.startsWith('sb-'))) return true;
    }
    return false;
  };

  const describe = (el: Element) => {
    const role = el.getAttribute('role');
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join('');
    const id = el.id && !/[:«]/.test(el.id) ? `#${el.id}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}${role ? `[role="${role}"]` : ''}${name ? ` "${name}"` : ''}`;
  };

  /** A link or control inside a sentence: its block has letters that belong to no target. */
  const isInline = (el: Element) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    let block = el.parentElement;
    while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
    if (!block) return false;
    const clone = block.cloneNode(true) as Element;
    clone.querySelectorAll(SELECTOR).forEach((t) => t.remove());
    return /\p{L}{2,}/u.test(clone.textContent ?? '');
  };

  const targets = [...document.querySelectorAll(SELECTOR)].filter((el) => {
    if (inStorybookChrome(el)) return false;
    if (el.matches(':disabled') || el.closest('[inert]')) return false;
    if (getComputedStyle(el).pointerEvents === 'none') return false;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    // Visually hidden until focused (the skip link): not a pointer target while hidden.
    if (getComputedStyle(el).clipPath === 'inset(50%)') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  });

  const rects = new Map(targets.map((el) => [el, el.getBoundingClientRect()]));
  const undersized = targets.filter((el) => {
    const r = rects.get(el);
    return r !== undefined && (r.width < MIN - TOLERANCE || r.height < MIN - TOLERANCE) && !isInline(el);
  });
  const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  const violations: string[] = [];
  for (const el of undersized) {
    const r = rects.get(el);
    if (!r) continue;
    const c = centre(r);
    const clash = targets.find((other) => {
      // A target nested in (or wrapping) this one is the same pointer region, not a neighbour.
      if (other === el || other.contains(el) || el.contains(other)) return false;
      const o = rects.get(other);
      if (!o) return false;
      // The circle intersects the other target's box…
      const dx = Math.max(o.left - c.x, 0, c.x - o.right);
      const dy = Math.max(o.top - c.y, 0, c.y - o.bottom);
      if (Math.hypot(dx, dy) < RADIUS - TOLERANCE) return true;
      // …or the other undersized target's circle.
      if (!undersized.includes(other)) return false;
      const oc = centre(o);
      return Math.hypot(oc.x - c.x, oc.y - c.y) < MIN - TOLERANCE;
    });
    if (clash) {
      violations.push(
        `${describe(el)} is ${r.width.toFixed(1)}×${r.height.toFixed(1)}px and its 24px circle overlaps ${describe(clash)} (SC 2.5.8)`,
      );
    }
  }
  return violations;
}
