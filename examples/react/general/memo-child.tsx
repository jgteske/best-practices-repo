import { memo, useCallback, useState } from "react";

// `memo` skips re-rendering a child when its props are unchanged by reference.
// It only pays off when the callbacks/objects you pass are ALSO stable - hence
// useCallback here. Reach for this pair to fix a measured re-render problem, not
// pre-emptively on every component.

type RowProps = { label: string; onSelect: (label: string) => void };

const Row = memo(function Row({ label, onSelect }: RowProps) {
  return <button onClick={() => onSelect(label)}>{label}</button>;
});

export function SelectableList({ items }: { items: readonly string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Stable identity across renders -> memoized Rows don't re-render when only
  // `selected` changes.
  const handleSelect = useCallback((label: string) => setSelected(label), []);

  return (
    <div>
      {items.map((item) => (
        <Row key={item} label={item} onSelect={handleSelect} />
      ))}
      <p>Selected: {selected ?? "none"}</p>
    </div>
  );
}
