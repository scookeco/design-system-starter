// @expect clean
// @as src/examples/Fixture.tsx
// Negative control: correct consumer code, including a justified escape hatch, lints clean.
import { Button, Cluster } from '../index';

export const Fixture = () => (
  <Cluster gap="sm" justify="end">
    <Button variant="secondary">Cancel</Button>
    {/* eslint-disable-next-line no-restricted-syntax -- analytics hook for checkout; owner: growth; remove when the analytics variant ships */}
    <Button UNSAFE_className="analytics-checkout">Pay</Button>
  </Cluster>
);
