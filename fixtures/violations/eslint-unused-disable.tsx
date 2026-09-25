// @expect unused-disable-directive
// @as src/examples/Fixture.tsx
import { Button } from '../index';

export const Fixture = () => (
  // eslint-disable-next-line no-restricted-syntax -- stale exception left behind after the variant shipped
  <Button variant="secondary">Go</Button>
);
