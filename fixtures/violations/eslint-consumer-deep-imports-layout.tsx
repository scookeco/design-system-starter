// @expect no-restricted-imports /public entry point/
// @as src/examples/Fixture.tsx
import { AppShell } from '../layouts/AppShell/AppShell';

export const Fixture = () => <AppShell brand="Acme" nav={null}>Go</AppShell>;
