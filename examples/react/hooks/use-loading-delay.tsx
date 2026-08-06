import { useEffect, useRef, useState } from "react";

// Two timing bugs that only a human notices, both caused by rendering the
// loading flag directly:
//
//   1. A 40ms cached response flashes a spinner for one frame. The user reads it
//      as a glitch, not as feedback.
//   2. A response that lands 30ms after the spinner appears makes it flicker in
//      and straight back out.
//
// The fix is a spinner with a minimum lifetime and a delayed birth: show nothing
// for the first `delayMs`, and once shown, stay for at least `minDurationMs`.

export type LoadingDelayOptions = {
  /** Do not show a spinner for a response that arrives faster than this. */
  delayMs?: number;
  /** Once visible, stay visible at least this long. */
  minDurationMs?: number;
};

export function useLoadingDelay(
  isLoading: boolean,
  { delayMs = 200, minDurationMs = 400 }: LoadingDelayOptions = {},
): boolean {
  const [visible, setVisible] = useState(false);
  // performance.now() is monotonic: a clock adjustment mid-request cannot make
  // the spinner's measured age negative.
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (visible) return;
      const id = setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, delayMs);
      // Loading finished before `delayMs`: the timer is cleared and the spinner
      // is never shown at all. This is the branch that removes the flash.
      return () => clearTimeout(id);
    }

    if (!visible) return;

    const shownFor = performance.now() - (shownAt.current ?? performance.now());
    const id = setTimeout(() => {
      shownAt.current = null;
      setVisible(false);
    }, Math.max(0, minDurationMs - shownFor));
    return () => clearTimeout(id);
  }, [isLoading, visible, delayMs, minDurationMs]);

  return visible;
}

type Result = { id: string; title: string };

// Layer 3: the request state and the *perceived* request state are two different
// values, and only the second one belongs in the markup.
export function useSearchResults(query: string) {
  const [results, setResults] = useState<Result[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const showSpinner = useLoadingDelay(isFetching, { delayMs: 200, minDurationMs: 400 });

  useEffect(() => {
    if (query === "") {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setIsFetching(true);

    void fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<Result[]>)
      .then(setResults)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetching(false);
      });

    return () => controller.abort();
  }, [query]);

  return { results, showSpinner } as const;
}

// Layer 4: renders the perceived state.
export function SearchResults({ query }: { query: string }) {
  const { results, showSpinner } = useSearchResults(query);

  return (
    <div aria-busy={showSpinner}>
      {showSpinner && <span role="status">Searching…</span>}
      <ul>
        {results.map((result) => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}
