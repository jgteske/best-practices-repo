/**
 * The manual `AbortController` pattern: hold a controller, abort the previous
 * request before starting the next one.
 *
 * This is the canonical "search as you type" fix. Each keystroke cancels the
 * request still in flight, so only the latest query's response can arrive -
 * eliminating the out-of-order race where a slow early response lands *after*
 * (and overwrites) a fast later one.
 */
class SearchClient {
  private inFlight: AbortController | null = null;

  async search(query: string): Promise<readonly string[]> {
    // Cancel whatever request is still running from the previous keystroke.
    this.inFlight?.abort();

    const controller = new AbortController();
    this.inFlight = controller;

    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    return (await response.json()) as string[];
  }

  /** Tear down (e.g. on unmount): cancel any request still in flight. */
  dispose(): void {
    this.inFlight?.abort();
  }
}

/**
 * Cooperative cancellation in your *own* long-running loop. `fetch` checks the
 * signal for you, but code you write has to check it at safe points.
 * `signal.throwIfAborted()` throws the signal's `reason` if (and only if) it
 * has aborted - the same shape `fetch` would have thrown, so callers handle
 * cancellation identically whether it came from the network or from here.
 */
async function processAll<T>(
  items: readonly T[],
  handle: (item: T) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  for (const item of items) {
    signal.throwIfAborted(); // bail out between items if we've been cancelled
    await handle(item);
  }
}

export { SearchClient, processAll };
