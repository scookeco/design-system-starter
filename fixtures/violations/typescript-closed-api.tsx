// @expect typescript-closed-api
// Props types of system components, primitives and layouts reject className and style at compile time.
// Every diagnostic in this file must be about className or style.
import { AppShell, Button, Stack } from '../../src/index';

export const WithClassName = () => <Button className="make-it-pop">Go</Button>;
export const WithStyle = () => <Stack style={{ padding: 13 }}>Go</Stack>;
export const LayoutWithClassName = () => (
  <AppShell brand="Acme" nav={null} className="wide-shell">
    Go
  </AppShell>
);
