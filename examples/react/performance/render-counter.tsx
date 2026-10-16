import { createContext, useContext, useEffect } from "react";

// #region render-counter
/**
 * Test-only instrumentation: components call useCountRenders("Name"), and a test
 * provides a function that tallies the calls. With no provider (in the app) it does nothing.
 */
export const RenderCounter = createContext<((name: string) => void) | null>(null);

export function useCountRenders(name: string): void {
  const count = useContext(RenderCounter);
  // No dependency array: runs after EVERY committed render of this component,
  // and not at all when React skips it (memo bail-out, or a parent re-render it isn't part of).
  useEffect(() => {
    count?.(name);
  });
}
// #endregion render-counter

/** A tally for tests: `counts.get("Name")` is how many times it rendered. */
export function createRenderTally(): { counts: Map<string, number>; count: (name: string) => void } {
  const counts = new Map<string, number>();
  return { counts, count: (name) => counts.set(name, (counts.get(name) ?? 0) + 1) };
}
