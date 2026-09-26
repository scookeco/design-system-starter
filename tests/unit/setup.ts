/**
 * Shared unit-test setup. findBy* and waitFor give up after 1 s by default; a busy machine running
 * every file in parallel can take longer than that to load a lazy route and answer its queries, so
 * they wait up to 5 s. A test that's really broken still fails, just later.
 */
import { configure } from '@testing-library/dom';

configure({ asyncUtilTimeout: 5_000 });
