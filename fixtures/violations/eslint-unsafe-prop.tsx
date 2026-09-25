// @expect no-restricted-syntax /UNSAFE_ prop/
// @as src/examples/Fixture.tsx
import { Button } from '../index';

export const Fixture = () => <Button UNSAFE_className="legacy">Go</Button>;
