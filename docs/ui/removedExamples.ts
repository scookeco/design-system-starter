/**
 * Golden examples this repo has deleted, by story title id: the part of a story id before "--"
 * ("examples-inbox" for Examples/Inbox). The Guides still describe every archetype; a link to an
 * example listed here renders as plain text instead of a dead link, and Page archetypes says it isn't
 * in this repo.
 *
 * tests/unit/story-links.test.ts keeps this list honest: an entry must be an example, must have no
 * stories left, and must still be named by a link in docs/. Every other link must reach a story.
 * The starter ships with none removed.
 */
export const REMOVED_EXAMPLES: readonly string[] = [];

/** The title id of a story id: "examples-inbox--default" → "examples-inbox". */
export const titleIdOf = (storyId: string) => storyId.split('--')[0] ?? storyId;

/** Whether a story id belongs to an example this repo deleted. */
export const isRemovedExample = (storyId: string) => REMOVED_EXAMPLES.includes(titleIdOf(storyId));
