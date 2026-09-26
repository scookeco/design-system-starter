/**
 * Per-story (and per-test) server behaviours layered over the default handlers: a request held
 * open forever (loading and pending states), a real error response, an empty workspace and a
 * payload that breaks the contract.
 */
import { delay, http, HttpResponse } from 'msw';

type Method = 'get' | 'post' | 'patch' | 'delete';
const API = '*/api/t/:tenant';

/** Never answers: the page stays in its loading or pending state. Tag the story `busy`. */
export const hold = (method: Method, path: string) => http[method](`${API}${path}`, async () => delay('infinite'));

/** Answers with a real error response. */
export const fail = (method: Method, path: string, status = 500, code = 'server_error', message = 'The server hit a problem. Try again.') =>
  http[method](`${API}${path}`, () => HttpResponse.json({ error: { code, message } }, { status }));

/** A workspace with no records yet. */
export const emptyWorkspace = [
  http.get(`${API}/records`, () => HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 10 })),
  http.get(`${API}/records/counts`, () =>
    HttpResponse.json({ counts: { all: 0, open: 0, drafts: 0, archived: 0 }, statuses: { draft: 0, pending: 0, active: 0, overdue: 0, archived: 0 } }),
  ),
];

/** A 200 whose body breaks the contract: the boundary rejects it and the page shows its error state. */
export const malformed = (path: string) => http.get(`${API}${path}`, () => HttpResponse.json({ items: [{ id: 42 }], total: 'many' }));
