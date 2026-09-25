// @expect no-restricted-imports /never imports a layout/
// @as src/primitives/Stack/Fixture.tsx
import { AppShell } from '../../layouts';

export const Fixture = () => <AppShell brand="Acme" nav={null}>Go</AppShell>;
