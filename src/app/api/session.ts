/** The session endpoints: loaded once at start, before any workspace data; ended on sign-out. */
import { z } from 'zod';
import { request } from './client';
import { SessionSchema } from './schemas';

export const getSession = (signal?: AbortSignal) => request(SessionSchema, '/session', { signal });

export const deleteSession = () => request(z.object({ signedOut: z.literal(true) }), '/session', { method: 'DELETE' });
