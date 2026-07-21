import { useState } from "react";

// The most common Effect misuse is using one to (a) transform data for
// rendering, or (b) respond to a user event. Neither needs an Effect.

type Item = { id: string; name: string; done: boolean };

export function TaskSummary({ items }: { items: readonly Item[] }) {
  const [showDone, setShowDone] = useState(true);

  // ❌ Anti-pattern: mirroring derived data into state via an Effect.
  //    const [visible, setVisible] = useState<Item[]>([]);
  //    useEffect(() => {
  //      setVisible(showDone ? items : items.filter((i) => !i.done));
  //    }, [items, showDone]); // extra render, easy to desync

  // ✅ Just compute it during render - no Effect, no second source of truth.
  const visible = showDone ? items : items.filter((i) => !i.done);

  // ✅ Respond to a user event IN THE HANDLER, not in an Effect that watches
  //    state. The click is the cause; do the work where the cause happens.
  const handleToggle = () => setShowDone((prev) => !prev);

  return (
    <div>
      <button onClick={handleToggle}>
        {showDone ? "Hide" : "Show"} completed
      </button>
      <ul>
        {visible.map((i) => (
          <li key={i.id}>{i.name}</li>
        ))}
      </ul>
    </div>
  );
}

// Rule of thumb: an Effect is for SYNCHRONISING with an EXTERNAL system
// (network, DOM, subscriptions, timers) - not for reacting to your own state.
