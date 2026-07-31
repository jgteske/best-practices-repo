import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEventCallback } from "./stable-callback";

// A four-layer chain: useLatestRef -> useEventCallback -> useDebouncedCallback
// -> useDebouncedSearch -> SearchBox. Each layer adds exactly one concern:
// freshness, then timing, then request cancellation, then markup.

// The debounced function carries its own controls, so callers can cancel a
// pending call (input cleared) or run it immediately (Enter pressed).
export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void;
  flush: () => void;
};

// Layer 2: collapse a burst of calls into one, `delay`ms after the last call.
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): Debounced<A> {
  // Chaining on useEventCallback is what makes the returned function stable:
  // `fn` can be an inline arrow, yet nothing below re-creates the debouncer.
  const stableFn = useEventCallback(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const flush = useCallback(() => {
    const args = pending.current;
    cancel();
    if (args !== null) stableFn(...args);
  }, [cancel, stableFn]);

  // A timer that outlives the component is a leak, and setting state from it is
  // a bug. `cancel` has a stable identity, so this registers once and runs its
  // cleanup exactly once: on unmount.
  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    const debounced = (...args: A) => {
      pending.current = args;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        pending.current = null;
        stableFn(...args);
      }, delay);
    };
    return Object.assign(debounced, { cancel, flush });
  }, [stableFn, delay, cancel, flush]);
}

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; results: string[] }
  | { status: "error"; message: string };

// Layer 3: debounced typing AND cancelled in-flight requests. Debouncing alone
// still leaves a race - two requests can be in flight after a pause - so the
// timing hook is chained together with an AbortController.
export function useDebouncedSearch(delay = 300) {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  const run = useDebouncedCallback(async (query: string) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      const results = (await res.json()) as string[];
      setState({ status: "done", results });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({ status: "error", message: err instanceof Error ? err.message : "Search failed" });
    }
  }, delay);

  const search = useCallback(
    (query: string) => {
      if (query.trim() === "") {
        run.cancel();
        inFlight.current?.abort();
        setState({ status: "idle" });
        return;
      }
      // Show the spinner on the keystroke, not `delay`ms later.
      setState({ status: "searching" });
      run(query);
    },
    [run],
  );

  // The debouncer cleans up its own timer; this cleans up the request it started.
  useEffect(() => () => inFlight.current?.abort(), []);

  return { state, search, searchNow: run.flush } as const;
}

// Layer 4: markup only - no timers, no requests, no race conditions.
export function SearchBox() {
  const { state, search, searchNow } = useDebouncedSearch();

  return (
    <div>
      <input
        onChange={(e) => search(e.target.value)}
        // Enter skips the remaining wait and fires the pending call now.
        onKeyDown={(e) => e.key === "Enter" && searchNow()}
      />
      {state.status === "searching" && <span>Searching...</span>}
      {state.status === "error" && <span role="alert">{state.message}</span>}
      {state.status === "done" && (
        <ul>
          {state.results.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
