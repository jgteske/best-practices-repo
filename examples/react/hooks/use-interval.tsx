import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "./stable-callback";

// Layer 2: the declarative interval. `delay` is the whole API surface: a number
// runs the clock, `null` pauses it. The callback is read from a ref at fire
// time, so a caller's inline arrow never restarts the interval - only a real
// change of `delay` does, and then the cleanup clears the old one first.
export function useInterval(callback: () => void, delay: number | null) {
  const latest = useLatestRef(callback);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => latest.current(), delay);
    return () => clearInterval(id);
  }, [delay, latest]);
}

type PollState<T> = {
  data: T | null;
  error: string | null;
  /** Consecutive failures - drives the backoff delay. */
  failures: number;
};

// Layer 3: polling is an interval plus three timing rules that a raw
// setInterval always gets wrong.
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  { baseDelay = 5_000, maxDelay = 60_000 }: { baseDelay?: number; maxDelay?: number } = {},
) {
  const [state, setState] = useState<PollState<T>>({ data: null, error: null, failures: 0 });
  const [visible, setVisible] = useState(() => !document.hidden);
  const latestFetcher = useLatestRef(fetcher);
  const inFlight = useRef<AbortController | null>(null);

  // Rule 1: never poll a hidden tab. Browsers throttle background timers
  // anyway, and a backgrounded tab that wakes up would fire a thundering herd.
  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Rule 2: one request at a time. A slow response must not overlap the next
  // tick, so each tick aborts its predecessor.
  const tick = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const data = await latestFetcher.current(controller.signal);
      setState({ data, error: null, failures: 0 });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Poll failed",
        failures: prev.failures + 1,
      }));
    }
  }, [latestFetcher]);

  // Rule 3: back off on failure. Each consecutive failure doubles the delay up
  // to `maxDelay`; the first success resets `failures` and with it the clock.
  const delay = visible ? Math.min(baseDelay * 2 ** state.failures, maxDelay) : null;

  useInterval(tick, delay);

  // An interval's first tick is one full delay away, which would leave the UI
  // empty for 5s on mount - so fetch immediately on mount and whenever the tab
  // becomes visible again. `tick` is stable, so this runs only on that change.
  useEffect(() => {
    if (visible) void tick();
  }, [visible, tick]);

  useEffect(() => () => inFlight.current?.abort(), []);

  return { ...state, delay, refresh: tick } as const;
}

type Health = { ok: boolean };

// Layer 4: the component passes an inline fetcher and gets a live value back.
export function HealthWidget() {
  const { data, error, delay, refresh } = usePolling<Health>(
    (signal) => fetch("/api/health", { signal }).then((res) => res.json() as Promise<Health>),
    { baseDelay: 5_000 },
  );

  return (
    <div>
      <span>{data?.ok ? "Healthy" : "Unknown"}</span>
      {error && <span role="alert">{error}</span>}
      <span>{delay === null ? "paused (tab hidden)" : `every ${delay / 1000}s`}</span>
      <button onClick={() => void refresh()}>Refresh now</button>
    </div>
  );
}
