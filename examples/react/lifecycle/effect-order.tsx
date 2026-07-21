import { useEffect, useLayoutEffect, useRef, useState } from "react";

// This component makes the render/commit lifecycle observable. Watch the console
// order across mount, update (on click), and unmount.

export function LifecycleDemo({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  const renders = useRef(0);

  // 1. RENDER PHASE - runs first, on every render, top to bottom. Must be pure:
  //    no side effects, no DOM reads/writes. Only compute and return JSX.
  renders.current += 1;
  console.log(`render #${renders.current} (count=${count})`);

  // 2. useLayoutEffect - runs AFTER the DOM is mutated but BEFORE the browser
  //    paints. Use it only when you must read layout (measure a node) or write
  //    to the DOM synchronously to avoid a visible flicker.
  useLayoutEffect(() => {
    console.log("  layout effect: DOM ready, not yet painted");
  });

  // 3. useEffect (passive) - runs AFTER paint. This is the default for most
  //    side effects: fetching, subscriptions, logging, timers.
  useEffect(() => {
    console.log("  passive effect: after paint");

    // 4. CLEANUP - runs before the next effect re-run, and once on unmount.
    return () => {
      console.log("  cleanup: before next run / on unmount");
    };
    // Empty deps -> effect+cleanup fire once on mount / once on unmount.
    // With [count] they'd fire on every count change (cleanup, then effect).
  }, []);

  return <button onClick={() => setCount((c) => c + 1)}>{label}: {count}</button>;
}

// Mount order:   render -> layout effect -> (paint) -> passive effect
// Update order:  render -> layout effect -> (paint) -> passive effect
//                (dependency-scoped effects also run their cleanup first)
// Unmount order: passive cleanup -> (component gone)
