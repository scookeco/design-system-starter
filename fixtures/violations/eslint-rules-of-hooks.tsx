// @expect react-hooks/rules-of-hooks
// @as src/examples/Fixture.tsx
import { useState } from 'react';

export function Fixture({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [value] = useState(0);
    return <span>{value}</span>;
  }
  return null;
}
