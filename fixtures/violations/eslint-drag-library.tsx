// @expect starter/drag-needs-alternative /^A drag-and-drop library needs/
// @as src/components/Fixture/Fixture.tsx
// A sortable list built on a drag-and-drop library, with no declared single-pointer alternative.
import { useDraggable } from '@dnd-kit/core';

export function Fixture({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <li ref={setNodeRef} {...attributes} {...listeners}>
      {label}
    </li>
  );
}
