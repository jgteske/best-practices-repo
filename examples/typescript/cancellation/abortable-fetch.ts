/**
 * Threading an AbortSignal through an async function so the *caller* stays in
 * control of cancellation.
 *
 * A signal is just another parameter - accept one, hand it to `fetch`, done.
 * When it aborts, `fetch` tears down the in-flight request and rejects with a
 * DOMException whose `name` is "AbortError". That's a *cancellation*, not a
 * failure, so it deserves its own branch rather than being logged like a real
 * error or surfaced to the user.
 */

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // `signal: undefined` is illegal under exactOptionalPropertyTypes (the DOM
  // type is `AbortSignal | null`), so omit the whole init when there's no
  // signal rather than passing an explicit undefined.
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

/** Distinguish "the caller cancelled us" from a genuine network/HTTP error. */
function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

type Repo = { id: number; name: string };

async function loadRepos(signal?: AbortSignal): Promise<readonly Repo[]> {
  try {
    return await fetchJson<Repo[]>("/api/repos", signal);
  } catch (error) {
    if (isAbortError(error)) {
      // Expected: the caller moved on. Swallow it - there's nobody to tell.
      return [];
    }
    throw error;
  }
}

export { fetchJson, isAbortError, loadRepos };
