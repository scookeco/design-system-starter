import type { UsageDoc } from './types';

/**
 * Every usage doc, keyed by <Name> from docs/usage/<Name>.usage.tsx. <Name> matches the
 * last segment of the component's story title ("Components/Button" → Button).
 */
const modules = import.meta.glob<UsageDoc>('./*.usage.tsx', { eager: true, import: 'usage' });

export const usageDocs: ReadonlyMap<string, UsageDoc> = new Map(
  Object.entries(modules).map(([path, usage]) => [path.replace(/^.*\//, '').replace(/\.usage\.tsx$/, ''), usage]),
);

/** The usage doc for a story title, if one exists. */
export const usageForTitle = (title: string): UsageDoc | undefined => usageDocs.get(title.split('/').at(-1) ?? '');
