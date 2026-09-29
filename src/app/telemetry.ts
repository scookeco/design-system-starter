/**
 * Instrumentation: one sink for what the app does and how it goes. Two sources report here, and
 * nothing else needs to remember to:
 *
 *   mutations  every named mutation, from one place: the QueryClient's MutationCache. Each reports
 *              start, then exactly one outcome: success (with its duration), failure (with its error
 *              code) or cancelled (a write dropped before it was sent: Undo inside the window,
 *              sign-out). A verb doesn't opt in; being a mutation with a name is enough.
 *   rendering  a route (or region) whose renderer threw, from the error boundary that caught it
 *              (src/app/routing/RenderBoundary.tsx).
 *
 * Events carry names, ids and codes, never what a person typed or who they are: no names, emails,
 * record contents or error messages (a message can quote a value). Mutation variables are never
 * read. A product points `telemetry.sink` at its analytics or tracing; development logs to the
 * console; tests replace it (tests/unit/app-harness.tsx, captureTelemetry).
 */
import type { Mutation, QueryClient } from '@tanstack/react-query';
import { ApiError, ContractError } from './api/client';
import { isCancelled } from './model/writeQueue';

export type MutationPhase = 'start' | 'success' | 'failure' | 'cancelled';

export interface MutationEvent {
  kind: 'mutation';
  /** The verb: the mutation key's name (renameRecord, inviteMember, markRead…). */
  name: string;
  phase: MutationPhase;
  /** Pairs a start with its outcome. */
  mutationId: number;
  /** The workspace it ran in (the key's partition). */
  tenant: string;
  /** The entity it wrote, when the key names one (a record id). Ids only. */
  subject?: string;
  /** From start to outcome, including the refetch the verb waits for. Outcomes only. */
  durationMs?: number;
  /** Failures: the server's error code (conflict, forbidden, server_error), or network, contract, unknown. */
  code?: string;
  /** Failures the server answered: its HTTP status. */
  status?: number;
}

export interface RenderEvent {
  kind: 'render';
  phase: 'failure';
  /** Which boundary caught it: the route's path pattern (/records/:id), never the URL itself. */
  region: string;
  /** The error's class (TypeError, Error), not its message. */
  code: string;
}

export type TelemetryEvent = MutationEvent | RenderEvent;
export type TelemetrySink = (event: TelemetryEvent) => void;

/** Development: every event on the console. */
export const consoleSink: TelemetrySink = (event) => {
  console.debug('[telemetry]', event);
};

const quiet: TelemetrySink = () => undefined;

/** Where events go. An app points this at its analytics or tracing; tests replace it. */
export const telemetry: { sink: TelemetrySink } = {
  sink: import.meta.env.DEV && import.meta.env.MODE !== 'test' ? consoleSink : quiet,
};

/** Report one event. A sink that throws never breaks the write or the render that reported. */
export const emit = (event: TelemetryEvent) => {
  try {
    telemetry.sink(event);
  } catch {
    // Instrumentation is best effort by design.
  }
};

/** An outcome a mutation reports in place of the default one (see `outcomeMeta`). */
export type ReportedOutcome = { phase: 'success' } | { phase: 'failure'; code: string } | { phase: 'cancelled' };

/**
 * For a mutation whose function resolves even when the work failed (an assistant stream keeps what
 * arrived, so it never rejects): how its answer maps to an outcome. Pass as the mutation's `meta`.
 */
export const outcomeMeta = <T,>(outcome: (data: T) => ReportedOutcome | undefined) => ({ telemetryOutcome: outcome });

/** What went wrong, as a code: never the message. */
export const failureOf = (error: unknown): { code: string; status?: number } => {
  if (error instanceof ApiError) return { code: error.code, status: error.status };
  if (error instanceof ContractError) return { code: 'contract' };
  // fetch rejects with a TypeError when the connection fails: the outcome on the server is unknown.
  if (error instanceof TypeError) return { code: 'network' };
  return { code: 'unknown' };
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/** The verb a mutation reports as: its key's name, after the partition ([tenant, scope, name, params]). */
export const mutationName = (mutation: Pick<Mutation<unknown, unknown, unknown, unknown>, 'options'>) => {
  const key = mutation.options.mutationKey;
  return Array.isArray(key) && typeof key[2] === 'string' ? key[2] : 'unnamed';
};

type AnyMutation = Mutation<unknown, unknown, unknown, unknown>;

const instrumented = new WeakSet<QueryClient>();

/**
 * Report every mutation this cache runs. Idempotent per client and never unsubscribed: the
 * subscription lives as long as the cache, like the write queues beside it. Called while the app's
 * providers render, so it's in place before any page's first effect can start a write.
 */
export function instrumentMutations(client: QueryClient) {
  if (instrumented.has(client)) return;
  instrumented.add(client);
  const started = new WeakMap<AnyMutation, number>();
  const finished = new WeakSet<AnyMutation>();

  const base = (mutation: AnyMutation) => {
    const key = mutation.options.mutationKey;
    const params = Array.isArray(key) ? (key[3] as { id?: unknown } | undefined) : undefined;
    return {
      kind: 'mutation' as const,
      name: mutationName(mutation),
      mutationId: mutation.mutationId,
      tenant: Array.isArray(key) && typeof key[0] === 'string' ? key[0] : '',
      ...(typeof params?.id === 'string' ? { subject: params.id } : {}),
    };
  };

  const finish = (mutation: AnyMutation, outcome: { phase: Exclude<MutationPhase, 'start'>; code?: string; status?: number }) => {
    if (finished.has(mutation) || !started.has(mutation)) return;
    finished.add(mutation);
    emit({ ...base(mutation), ...outcome, durationMs: Math.max(0, Date.now() - (started.get(mutation) ?? Date.now())) });
  };

  client.getMutationCache().subscribe((event) => {
    const mutation = event.mutation as AnyMutation | undefined;
    if (!mutation) return;
    if (event.type === 'removed') {
      // Removed while still running: the cache was cleared under it (sign-out). It never finished.
      if (mutation.state.status === 'pending') finish(mutation, { phase: 'cancelled' });
      return;
    }
    if (event.type !== 'updated') return;
    const action = event.action;
    if (action.type === 'pending') {
      // 'pending' is dispatched again when onMutate returns a context: one start per mutation.
      if (started.has(mutation)) return;
      started.set(mutation, Date.now());
      emit({ ...base(mutation), phase: 'start' });
    } else if (action.type === 'success') {
      const reported = (mutation.meta?.telemetryOutcome as ((data: unknown) => ReportedOutcome | undefined) | undefined)?.(action.data);
      finish(mutation, reported ?? { phase: 'success' });
    } else if (action.type === 'error') {
      const error = action.error;
      finish(mutation, isCancelled(error) || isAbort(error) ? { phase: 'cancelled' } : { phase: 'failure', ...failureOf(error) });
    }
  });
}
