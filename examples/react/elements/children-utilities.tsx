import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

// #region to-array
// `children` is opaque: one element, a string, an array, nested arrays, null...
// Children.toArray flattens it, drops null/undefined/booleans, and gives every
// item a stable key (".0", ".1", or ".$yourKey").
export function CountedList({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <>
      <p>{items.length} items</p>
      <ul>
        {items.map((child) => (
          <li key={isValidElement(child) ? child.key : String(child)}>{child}</li>
        ))}
      </ul>
    </>
  );
}
// #endregion to-array

// #region clone-anti
// ❌ Anti-pattern: a parent that secretly injects props into its children.
// The caller can't see where `selected` comes from, a wrapper component (or a
// Fragment) between Tabs and Tab silently breaks it, and TypeScript can't check
// that a child accepts the prop.
export function TabsCloning({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div role="tablist">
      {Children.map(children, (child) =>
        isValidElement<{ id: string; selected?: boolean }>(child)
          ? cloneElement(child, { selected: child.props.id === active })
          : child,
      )}
    </div>
  );
}
// #endregion clone-anti

// #region explicit
// ✅ Prefer data in, elements out: the parent renders the items itself, so
// every prop is explicit and type-checked. (For deep trees, use context.)
type Tab = { id: string; label: string };

export function Tabs({ tabs, active, onSelect }: { tabs: Tab[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={tab.id === active} onClick={() => onSelect(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
// #endregion explicit

// #region slot-guard
// isValidElement is the right tool for "is this slot an element or plain
// text?" - e.g. wrap a bare string icon name, pass an element through.
export function IconSlot({ icon }: { icon: ReactElement | string }) {
  return isValidElement(icon) ? icon : <span className={`icon icon-${icon}`} aria-hidden="true" />;
}
// #endregion slot-guard
