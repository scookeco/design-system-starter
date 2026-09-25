import type { ReactNode } from 'react';

/** Gallery-only placeholder that makes layout primitives visible. */
export function DemoBox({ children }: { children: ReactNode }) {
  return <div className="demo-box">{children}</div>;
}
