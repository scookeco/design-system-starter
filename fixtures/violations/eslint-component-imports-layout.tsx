// @expect no-restricted-imports /never imports a layout/
// @as src/components/Button/Fixture.tsx
import { AppShell } from '../../layouts/AppShell/AppShell';

export const Fixture = () => <AppShell brand="Acme" nav={null}>Go</AppShell>;
