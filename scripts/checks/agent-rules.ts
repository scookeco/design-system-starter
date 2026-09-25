/**
 * The agent rules block: the fenced block in CLAUDE.md between the agent-rules markers.
 * One extractor, so the manifest, llms.txt and the Guides/Agents page can't disagree about it.
 * Pure (no file system): the gallery imports CLAUDE.md?raw and calls it too.
 */
export const RULES_START = '<!-- agent-rules:start';
export const RULES_END = '<!-- agent-rules:end -->';

/** The rules text inside the marked fence, without the fence. Throws if the markers or fence are missing. */
export const extractAgentRules = (markdown: string): string => {
  const start = markdown.indexOf(RULES_START);
  const end = markdown.indexOf(RULES_END);
  if (start === -1 || end === -1 || end < start) throw new Error(`CLAUDE.md: the agent rules block needs "${RULES_START} … -->" and "${RULES_END}" markers around it.`);
  const between = markdown.slice(markdown.indexOf('\n', start) + 1, end);
  const fence = /^```[\w-]*\n([\s\S]*?)\n```\s*$/.exec(between.trim());
  if (!fence?.[1]) throw new Error('CLAUDE.md: the agent rules markers must wrap exactly one fenced code block.');
  return fence[1];
};
