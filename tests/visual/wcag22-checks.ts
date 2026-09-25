/**
 * WCAG 2.2 checks beyond the axe run, executed in the page by tests/visual/wcag22.spec.ts.
 *
 * Each function is passed to page.evaluate(), so it must be self-contained: no imports, no
 * references to anything outside its own body. Each returns a list of violations, one line per
 * offending element, starting with a selector-like description of it.
 */

/** The ids of the checks, as the fixture stories name them in an `expect:<id>` tag. */
export const CHECKS = ['target-size', 'accessible-authentication', 'consistent-help', 'focus-not-obscured'] as const;
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

/**
 * SC 2.4.11 Focus Not Obscured (Minimum), AA, for the element that has focus now: fails when no
 * part of it can be seen, because other content (a sticky action bar, a sticky table header, a fixed
 * banner) paints over every sampled point of its visible box, or because it isn't on screen at all.
 * Also returns a key naming the focused element (null when nothing, or <body>, has focus), so the
 * caller can tell when Tab has wrapped around.
 */
export function focusObscuredViolation(): { key: string | null; violations: string[] } {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { key: null, violations: [] };
  const w = window as unknown as { wcagFocusCount?: number };
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return { key: null, violations: [] };
  if (el.dataset.wcagFocusKey === undefined) {
    w.wcagFocusCount = (w.wcagFocusCount ?? 0) + 1;
    el.dataset.wcagFocusKey = String(w.wcagFocusCount);
  }
  const key = el.dataset.wcagFocusKey;
  const result = (violations: string[]) => ({ key, violations });

  const describe = (node: Element) => {
    const role = node.getAttribute('role');
    const name = (node.getAttribute('aria-label') ?? node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const cls = [...node.classList].slice(0, 2).map((c) => `.${c}`).join('');
    const id = node.id && !/[:«]/.test(node.id) ? `#${node.id}` : '';
    return `${node.tagName.toLowerCase()}${id}${cls}${role ? `[role="${role}"]` : ''}${name ? ` "${name}"` : ''}`;
  };

  const r = el.getBoundingClientRect();
  // Visually hidden focus targets (1px) are a Focus Visible question, not an obscuring one.
  if (r.width <= 1 || r.height <= 1) return result([]);

  // Sample the part inside the viewport. Hit testing already accounts for clipping by scroll
  // containers and for anything painted on top.
  const top = Math.max(r.top, 0);
  const left = Math.max(r.left, 0);
  const bottom = Math.min(r.bottom, window.innerHeight);
  const right = Math.min(r.right, window.innerWidth);
  if (bottom - top < 1 || right - left < 1) return result([`${describe(el)} has focus but is out of view (SC 2.4.11)`]);

  const STEPS = 4;
  const coverers = new Set<Element>();
  for (let i = 0; i <= STEPS; i += 1) {
    for (let j = 0; j <= STEPS; j += 1) {
      // Inset by 1px: the edge pixels of a box are shared with its neighbours.
      const x = left + 1 + ((right - left - 2) * i) / STEPS;
      const y = top + 1 + ((bottom - top - 2) * j) / STEPS;
      const hit = document.elementFromPoint(x, y);
      if (!hit) continue;
      if (hit === el || el.contains(hit) || hit.contains(el)) return result([]);
      coverers.add(hit);
    }
  }
  if (coverers.size === 0) return result([`${describe(el)} has focus but is out of view (SC 2.4.11)`]);
  const covering = [...coverers].map((c) => {
    let n: Element | null = c;
    while (n && !['sticky', 'fixed'].includes(getComputedStyle(n).position)) n = n.parentElement;
    return describe(n ?? c);
  });
  return result([`${describe(el)} has focus but is entirely hidden by ${[...new Set(covering)].join(', ')} (SC 2.4.11)`]);
}

/**
 * SC 3.3.8 Accessible Authentication (Minimum), AA, as far as markup shows it: every password field
 * can be filled by a password manager (autocomplete current-password or new-password) and has a
 * show-password control (a button whose aria-controls names it); no text entry field blocks paste;
 * no CAPTCHA-style cognitive test is on the page.
 */
export function accessibleAuthenticationViolations(): string[] {
  const violations: string[] = [];
  const describe = (node: Element) => {
    const label = node.id ? document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent?.trim() : undefined;
    return `${node.tagName.toLowerCase()}[type="${node.getAttribute('type') ?? ''}"]${label ? ` "${label}"` : ''}`;
  };

  const passwords = [...document.querySelectorAll<HTMLInputElement>('input[type="password"]')];
  for (const input of passwords) {
    const tokens = (input.getAttribute('autocomplete') ?? '').split(/\s+/);
    if (!tokens.includes('current-password') && !tokens.includes('new-password')) {
      violations.push(`${describe(input)} needs autocomplete="current-password" or "new-password" so a password manager can fill it (SC 3.3.8)`);
    }
    const toggle = input.id ? document.querySelector(`button[aria-controls~="${CSS.escape(input.id)}"]`) : null;
    if (!toggle) violations.push(`${describe(input)} has no show-password button (aria-controls="${input.id}") (SC 3.3.8)`);
  }

  const entries = document.querySelectorAll<HTMLElement>(
    'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"], input[type="search"], textarea',
  );
  for (const field of entries) {
    if (field.closest('#storybook-docs')) continue;
    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
    field.dispatchEvent(paste);
    if (paste.defaultPrevented) violations.push(`${describe(field)} blocks paste (SC 3.3.8)`);
  }

  const captcha = document.querySelector('iframe[src*="captcha" i], iframe[title*="captcha" i], [class*="captcha" i], [id*="captcha" i], [aria-label*="captcha" i]');
  if (captcha) violations.push(`${captcha.tagName.toLowerCase()} looks like a CAPTCHA: a cognitive function test needs an alternative (SC 3.3.8)`);
  return violations;
}

/**
 * SC 3.2.6 Consistent Help, A, for an app page: when the page renders the AppShell, its help slot
 * is present, not empty, in the header, after the global actions and before the account menu, the
 * same relative order on every page.
 */
export function consistentHelpViolations(): string[] {
  const shell = document.querySelector('.app-shell');
  if (!shell) return [];
  const help = shell.querySelector('.app-shell__help');
  if (!help || help.textContent?.trim() === '') return ['AppShell renders without help: pass its help slot on every app page (SC 3.2.6)'];
  if (!help.closest('.app-shell__header')) return ['AppShell help is not in the header (SC 3.2.6)'];
  const next = help.nextElementSibling;
  if (next && !next.classList.contains('app-shell__user')) return ['AppShell help must come right before the account menu (SC 3.2.6)'];
  return [];
}
