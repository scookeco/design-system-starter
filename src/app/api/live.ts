/**
 * Live updates: how this client hears about changes it didn't make (a colleague edits a record,
 * adds one, deletes one). Transport only, like the rest of src/app/api; what the cache does with an
 * event is decided once, in src/app/model/live.ts.
 *
 * The contract is a stream of events per workspace. A product serves it as Server-Sent Events
 * (GET /api/t/:tenant/events) and passes `eventSourceLive()` to AppProviders; the gallery and the
 * tests pass the mock channel (src/app/mocks/live.ts), which delivers the same events in process so
 * a story can push one at an exact moment. Either way, every message is parsed here, at the
 * boundary, before it can touch the cache.
 *
 * The server filters events by the recipient's grant: a viewer never hears about a draft, exactly
 * as a viewer's list query never returns one.
 */
import { z } from 'zod';
import { reporting, ContractError } from './client';
import { RecordSchema, type Tenant } from './schemas';

export const LiveEventSchema = z.discriminatedUnion('type', [
  /** A record this person can see changed. Carries the whole record, with its new version. */
  z.object({ type: z.literal('record.updated'), record: RecordSchema, by: z.string().min(1) }),
  /** A record this person can see appeared (created, or moved into their view). */
  z.object({ type: z.literal('record.created'), record: RecordSchema, by: z.string().min(1) }),
  /** A record this person could see is gone (deleted, or moved out of their view). */
  z.object({ type: z.literal('record.deleted'), id: z.string().min(1), by: z.string().min(1) }),
]);
export type LiveEvent = z.infer<typeof LiveEventSchema>;

/** Where live events come from. Subscribe per workspace; the returned function unsubscribes. */
export interface LiveSource {
  subscribe: (tenant: Tenant, onMessage: (data: unknown) => void) => () => void;
}

/**
 * Parse one message at the boundary. A message that breaks the contract is reported and dropped:
 * it never reaches the cache, and the stream carries on.
 */
export const parseLiveEvent = (data: unknown): LiveEvent | undefined => {
  const parsed = LiveEventSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  reporting.report(new ContractError('live event', parsed.error.issues));
  return undefined;
};

/** The production source: Server-Sent Events, one stream per workspace, reconnecting on its own. */
export const eventSourceLive = (): LiveSource => ({
  subscribe: (tenant, onMessage) => {
    const source = new EventSource(`/api/t/${tenant}/events`);
    source.onmessage = (message: MessageEvent<string>) => {
      try {
        onMessage(JSON.parse(message.data));
      } catch {
        onMessage(undefined);
      }
    };
    return () => source.close();
  },
});
