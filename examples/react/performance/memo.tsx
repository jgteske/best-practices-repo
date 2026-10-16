import { memo, useCallback, useState, type CSSProperties } from "react";
import { useCountRenders } from "./render-counter";

export type Item = { id: number; label: string };

// #region memo-child
type ListProps = { items: Item[]; onSelect: (id: number) => void; style?: CSSProperties };

/** memo(): skip re-rendering when every prop is === to last time (a shallow compare). */
export const ItemList = memo(function ItemList({ items, onSelect, style }: ListProps) {
  useCountRenders("ItemList");
  return (
    <ul style={style}>
      {items.map((item) => (
        <li key={item.id}>
          <button onClick={() => onSelect(item.id)}>{item.label}</button>
        </li>
      ))}
    </ul>
  );
});
// #endregion memo-child

// #region unstable-props
/** ❌ memo is defeated: a new function and a new object on every render. */
export function UnstableParent({ items }: { items: Item[] }) {
  const [clicks, setClicks] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <button onClick={() => setClicks((c) => c + 1)}>Clicked {clicks}</button>
      <p>Selected: {selected ?? "none"}</p>
      <ItemList items={items} onSelect={(id) => setSelected(id)} style={{ padding: 8 }} />
    </>
  );
}
// #endregion unstable-props

// #region stable-props
const LIST_STYLE: CSSProperties = { padding: 8 }; // a constant: same object every time

/** ✅ Every prop keeps its identity, so clicking the counter doesn't re-render the list. */
export function StableParent({ items }: { items: Item[] }) {
  const [clicks, setClicks] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const handleSelect = useCallback((id: number) => setSelected(id), []); // setters are stable
  return (
    <>
      <button onClick={() => setClicks((c) => c + 1)}>Clicked {clicks}</button>
      <p>Selected: {selected ?? "none"}</p>
      <ItemList items={items} onSelect={handleSelect} style={LIST_STYLE} />
    </>
  );
}
// #endregion stable-props
