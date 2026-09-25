// @expect typescript-clean
// Negative control: the escape hatch is typed and allowed by the compiler (lint still flags it).
import { Button, Stack } from '../../src/index';

export const Fixture = () => (
  <Stack gap="sm" UNSAFE_style={{ order: 1 }}>
    <Button UNSAFE_className="legacy-hook">Go</Button>
  </Stack>
);
