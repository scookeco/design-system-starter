// @expect clean
// @as src/components/Fixture/Fixture.tsx
// Negative control: a draggable row that declares its single-pointer alternative, and a
// non-draggable image, lint clean under starter/drag-needs-alternative.
export function Fixture({ label, onMove }: { label: string; onMove: (from: string, by: -1 | 1) => void }) {
  return (
    <li
      draggable
      data-drag-alternative="Move up and Move down buttons in this row"
      onDragStart={(event) => event.dataTransfer.setData('text/plain', label)}
      onDrop={(event) => onMove(event.dataTransfer.getData('text/plain'), 1)}
    >
      <img src="/avatar.png" alt="" draggable={false} />
      {label}
      <button type="button" onClick={() => onMove(label, -1)}>
        Move up
      </button>
      <button type="button" onClick={() => onMove(label, 1)}>
        Move down
      </button>
    </li>
  );
}
