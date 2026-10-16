import { memo, useDeferredValue, useState, useTransition, type ReactNode } from "react";

const ALL = Array.from({ length: 2_000 }, (_, i) => `item ${i}`);

/** Deliberately slow: filters a big list on every render. */
const Results = memo(function Results({ query }: { query: string }) {
  const matches = ALL.filter((item) => item.includes(query)).slice(0, 50);
  return (
    <ul aria-label="results">
      {matches.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
});

// #region deferred-value
/**
 * useDeferredValue: the input re-renders with every keystroke at full priority;
 * <Results> renders with a deferred copy of the query that React may let lag behind,
 * and abandons that render if another keystroke arrives first.
 */
export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  return (
    <>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }} aria-busy={isStale}>
        {/* memo matters here: without it, Results would re-render with every keystroke anyway */}
        <Results query={deferredQuery} />
      </div>
    </>
  );
}
// #endregion deferred-value

// #region transition
type Tab = "about" | "posts";

/**
 * useTransition: mark a state update as non-urgent. While the new tab renders,
 * the old one stays on screen and interactive, and isPending lets you show that.
 */
export function Tabs({ panels }: { panels: Record<Tab, ReactNode> }) {
  const [tab, setTab] = useState<Tab>("about");
  const [isPending, startTransition] = useTransition();
  const select = (next: Tab) => startTransition(() => setTab(next));
  return (
    <>
      <div role="tablist" aria-busy={isPending}>
        {(Object.keys(panels) as Tab[]).map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} onClick={() => select(name)}>
            {name}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[tab]}</div>
    </>
  );
}
// #endregion transition
