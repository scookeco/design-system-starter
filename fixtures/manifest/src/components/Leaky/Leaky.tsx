import type { HTMLAttributes } from 'react';

/** Accepts className and style: the manifest must flag it. */
export function Leaky(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
