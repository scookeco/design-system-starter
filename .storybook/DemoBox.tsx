import type { ReactNode } from 'react';

/** Gallery-only placeholder that makes layout primitives visible. */
export function DemoBox({ children }: { children: ReactNode }) {
  return <div className="demo-box">{children}</div>;
}

/**
 * Gallery-only narrow frame. Layouts respond to their container, not the viewport,
 * so this shows the collapsed state inside the fixed-width screenshot viewport.
 */
export function DemoNarrow({ children }: { children: ReactNode }) {
  return <div className="demo-narrow">{children}</div>;
}

/** Gallery-only dashed outline, to show the edge of a box and the padding inside it. */
export function DemoOutline({ children }: { children: ReactNode }) {
  return <div className="demo-outline">{children}</div>;
}
