import { useCallback, useEffect, useState } from "react";

// A small `useQuery`: fetch + validate + status union + cancellation + reload.
// It is the shape libraries like TanStack Query give you (plus caching,
// deduplication and retries) - write this one to understand them, and reach
// for the library once you need a cache shared between components.

export type QueryState<T> =
  | { status: "pending" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

export class HttpError extends Error {
  override name = "HttpError";
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

// Anything with a `parse(unknown): T` method: a zod schema fits as-is, so the
// response is validated, not just cast (see the TypeScript schema validation page).
export type Parser<T> = { parse: (input: unknown) => T };

export function useQuery<T>(url: string, schema: Parser<T>) {
  // The state remembers WHICH url it belongs to. When the url changes, the
  // stored result is for the old one, so render reports "pending" right away -
  // never one frame of the previous user's data.
  const [entry, setEntry] = useState<{ url: string; state: QueryState<T> }>({
    url,
    state: { status: "pending" },
  });
  const [isFetching, setIsFetching] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsFetching(true);

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new HttpError(response.status, url);
        return schema.parse(await response.json());
      })
      .then((data) => setEntry({ url, state: { status: "success", data } }))
      .catch((caught: unknown) => {
        // Aborted because the url changed or the component unmounted: not an error.
        if (controller.signal.aborted) return;
        const error = caught instanceof Error ? caught : new Error(String(caught));
        setEntry({ url, state: { status: "error", error } });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetching(false);
      });

    // Cleanup cancels the in-flight request, so a slow response for an old url
    // can never overwrite the result for the current one.
    return () => controller.abort();
  }, [url, schema, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const state: QueryState<T> = entry.url === url ? entry.state : { status: "pending" };

  // On reload, the previous data stays visible while `isFetching` is true.
  return { ...state, isFetching, reload } as const;
}
