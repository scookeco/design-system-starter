import type { ReactNode } from 'react';

/** A block of example code: a focusable, labelled region so keyboard users can scroll it. */
export function Code({ children, label }: { children: string; label: string }) {
  return (
    <pre className="docs-code" role="region" aria-label={label} tabIndex={0}>
      <code>{children.trim()}</code>
    </pre>
  );
}

/**
 * A link to another page of the gallery. Pages render inside Storybook's preview iframe,
 * so the link targets the top window. Story ids come from storybook-static/index.json.
 */
export function StoryLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a href={`./?path=/story/${id}`} target="_top">
      {children}
    </a>
  );
}
