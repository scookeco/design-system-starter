// @expect @eslint-community/eslint-comments/no-unlimited-disable
// @as src/examples/Fixture.tsx
/* eslint-disable */
import { Button } from '../index';

export const Fixture = () => <Button className="anything-goes">Go</Button>;
