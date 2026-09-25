import { createContext, useContext, type ReactNode } from 'react';
import type { Tenant } from './api/schemas';

const TenantContext = createContext<Tenant | null>(null);

/** The active workspace. Every request and every cache key includes it. */
export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return <TenantContext value={tenant}>{children}</TenantContext>;
}

export function useTenant(): Tenant {
  const tenant = useContext(TenantContext);
  if (!tenant) throw new Error('useTenant needs a TenantProvider (AppProviders) above it.');
  return tenant;
}
