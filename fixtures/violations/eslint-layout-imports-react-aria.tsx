// @expect no-restricted-imports /wrap React Aria in src.components first/
// @as src/layouts/AppShell/Fixture.tsx
import { DatePicker } from 'react-aria-components';

export const Fixture = () => <DatePicker aria-label="Due" />;
