/**
 * Building signals instead of managing controllers and timers by hand.
 *
 * - `AbortSignal.timeout(ms)` returns a signal that aborts *itself* after a
 *   deadline - no `AbortController`, no `setTimeout`/`clearTimeout` bookkeeping,
 *   nothing to leak. Note it aborts with a "TimeoutError", not an "AbortError".
 * - `AbortSignal.any([...])` combines several signals into one that aborts as
 *   soon as *any* member does. This is how you honour a caller's cancellation
 *   AND your own timeout with a single signal.
 */

/** Fetch that gives up after `ms`, while still respecting a caller's signal. */
async function fetchWithTimeout(
  url: string,
  ms: number,
  signal?: AbortSignal,
): Promise<Response> {
  const timeout = AbortSignal.timeout(ms);
  // Abort if EITHER the caller cancels or the deadline passes.
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const response = await fetch(url, { signal: combined });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response;
}

/**
 * Tell a timeout apart from a real cancellation. `signal.reason` (or the thrown
 * error) is a "TimeoutError" for deadlines and an "AbortError" for an explicit
 * `controller.abort()` - useful when you want to retry timeouts but not
 * user-initiated cancels.
 */
function describeAbort(error: unknown): "timeout" | "cancelled" | "other" {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "timeout";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "cancelled";
  }
  return "other";
}

export { fetchWithTimeout, describeAbort };
