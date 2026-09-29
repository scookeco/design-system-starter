/**
 * The mock server's route wrapper, shared by every mock module: the error body, latency and the
 * failure roll, sign-in, the workspace, then the route's capability. Its own module so a mock
 * module can import it without a cycle through handlers.ts (which re-exports it).
 */
import { delay, HttpResponse, type HttpResponseResolver } from 'msw';
import { TenantSchema, type Account, type Capability, type RecordEntity, type Tenant } from '../api/schemas';
import { can, DENIAL_REASONS, type Grant } from '../model/permissions';
import { mockConfig } from './config';
import { grantFor, isSignedIn } from './db';

export const error = (status: number, code: string, message: string, current?: RecordEntity | Account) =>
  HttpResponse.json({ error: { code, message, ...(current ? { current } : {}) } }, { status });

/** Latency, then the failure roll. */
export const settle = async (): Promise<Response | undefined> => {
  if (mockConfig.latencyMs > 0) await delay(mockConfig.latencyMs);
  if (mockConfig.failureRate > 0 && mockConfig.random() < mockConfig.failureRate) {
    return error(500, 'server_error', 'The server hit a problem. Try again.');
  }
  return undefined;
};

/**
 * Latency, the failure roll, the workspace, then the capability the route requires, then the
 * handler. Every workspace route declares its capability (deny by default): the server checks it
 * against the role it holds for the signed-in person, whatever the client did or didn't check.
 * Object-level rules (archived, legal hold) are the handler's, after this.
 */
export const handle =
  (
    /** The capability, or (when the body decides, as a rename vs an edit) a function of the body. */
    capability: Capability | ((body: unknown) => Capability),
    resolver: (args: { tenant: Tenant; grant: Grant; request: Request; params: Record<string, string | readonly string[] | undefined> }) => Response | Promise<Response>,
  ): HttpResponseResolver =>
  async ({ request, params }) => {
    const failed = await settle();
    if (failed) return failed;
    if (!isSignedIn()) return error(401, 'signed_out', 'Sign in to continue.');
    const tenant = TenantSchema.safeParse(params.tenant);
    if (!tenant.success) return error(404, 'unknown_tenant', 'No such workspace.');
    const grant = grantFor(tenant.data);
    const required = typeof capability === 'string' ? capability : capability(await request.clone().json().catch(() => undefined));
    if (!can(grant, required)) return error(403, 'forbidden', DENIAL_REASONS[required]);
    return resolver({ tenant: tenant.data, grant, request, params });
  };
