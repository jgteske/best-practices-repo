import { useState, type ReactNode } from "react";
import { useCountRenders } from "./render-counter";

/** Stands in for something expensive to render: a chart, a big table. */
export function SlowChart() {
  useCountRenders("SlowChart");
  return <svg aria-label="chart" />;
}

// #region lifted
/** ❌ The input's state lives in the page, so every keystroke re-renders the chart too. */
export function LiftedPage() {
  const [query, setQuery] = useState("");
  return (
    <>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <SlowChart />
    </>
  );
}
// #endregion lifted

// #region colocated
/** ✅ Move the state down into the component that uses it. No memo needed. */
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />;
}

export function ColocatedPage() {
  return (
    <>
      <SearchBox />
      <SlowChart />
    </>
  );
}
// #endregion colocated

// #region children-as-props
/**
 * ✅ When the state must wrap the slow part, take the slow part as `children`.
 * The <SlowChart /> element is created by the PARENT, so when Collapsible's state
 * changes, React sees the same element as before and skips it.
 */
function Collapsible({ children }: { children: ReactNode }) {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <section style={{ outline: highlighted ? "2px solid" : "none" }}>
      <button onClick={() => setHighlighted((h) => !h)}>Highlight</button>
      {children}
    </section>
  );
}

export function WrappedPage() {
  return (
    <Collapsible>
      <SlowChart />
    </Collapsible>
  );
}
// #endregion children-as-props
