// @expect starter/drag-needs-alternative /^Dragging needs a single-pointer alternative/
// @as src/components/Fixture/Fixture.tsx
// A sortable row that can only be reordered by dragging (WCAG 2.2 SC 2.5.7).
export function Fixture({ label, onMove }: { label: string; onMove: (from: string) => void }) {
  return (
    <li draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', label)} onDrop={(event) => onMove(event.dataTransfer.getData('text/plain'))}>
      {label}
    </li>
  );
}
