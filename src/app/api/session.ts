/** The session endpoint: loaded once at start, before any workspace data. */
import { request } from './client';
import { SessionSchema } from './schemas';

export const getSession = (signal?: AbortSignal) => request(SessionSchema, '/session', { signal });
