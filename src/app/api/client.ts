/**
 * The one door to the server. Every call names the schema its response must match; a payload
 * that doesn't is rejected here, reported, and surfaces as an error state. It never reaches the
 * cache, so nothing downstream has to defend against it.
 */
import type { z } from 'zod';
import { ErrorBodySchema, type Account, type RecordEntity } from './schemas';

/** A response the server sent on purpose: 4xx or 5xx with a code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** On a 409 conflict: the entity as the server has it now. */
  readonly current: RecordEntity | Account | undefined;

  constructor(status: number, code: string, message: string, current?: RecordEntity | Account) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.current = current;
  }
}

/** A response that broke the contract: the server said 2xx, but the body is not what the schema promises. */
export class ContractError extends Error {
  readonly path: string;
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(path: string, issues: readonly z.core.$ZodIssue[]) {
    super(`The response from ${path} didn’t match its contract.`);
    this.name = 'ContractError';
    this.path = path;
    this.issues = issues;
  }
}

/** Where boundary failures go. An app points this at its error tracker; tests replace it. */
export const reporting = {
  report: (error: ContractError) => {
    // Loud in development: a contract break is a bug in one side or the other.
    console.error(error.message, error.issues);
  },
};

const url = (path: string) => new URL(`/api${path}`, globalThis.location?.origin ?? 'http://localhost').toString();

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal | undefined;
  /**
   * A versioned write: the version this change was based on, sent as `If-Match`. The server
   * answers 409 (with the entity as it is now) if someone changed it since, and 428 if it's missing.
   */
  ifMatch?: number;
}

/** An entity version as an entity tag: version 3 → "3" (a strong validator, quoted as HTTP requires). */
export const etag = (version: number) => `"${String(version)}"`;

/** Fetch, then parse: `schema` decides what counts as a valid answer. */
export async function request<S extends z.ZodType>(schema: S, path: string, options: RequestOptions = {}): Promise<z.infer<S>> {
  const response = await fetch(url(path), {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.ifMatch === undefined ? {} : { 'If-Match': etag(options.ifMatch) }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const json: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = ErrorBodySchema.safeParse(json);
    if (parsed.success) throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.current);
    throw new ApiError(response.status, 'unknown', `The server answered ${String(response.status)}.`);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const error = new ContractError(path, parsed.error.issues);
    reporting.report(error);
    throw error;
  }
  return parsed.data;
}
