/**
 * The mock server's routes for the demo examples (search, notifications, reports, integrations,
 * billing, onboarding), one module per domain, gathered here and spread into `handlers`, so the
 * gallery and the tests serve them like every other route.
 */
import { notificationHandlers } from './notifications';
import { searchHandlers } from './search';

export const demoHandlers = [...searchHandlers, ...notificationHandlers];
