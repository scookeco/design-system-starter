// @expect @eslint-community/eslint-comments/require-description
// @as src/examples/Fixture.tsx
import { Button } from '../index';

export const Fixture = () => (
  // eslint-disable-next-line no-restricted-syntax
  <Button UNSAFE_className="legacy">Go</Button>
);
