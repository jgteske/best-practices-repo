// Small, framework-free "catch functions" that every other file in this folder
// builds on. JavaScript can throw *anything* (a string, `undefined`, a plain
// object), and strict mode types every `catch` binding as `unknown` - so the
// first job of error handling is turning that unknown into something usable.

// Normalize any thrown value into a real Error, keeping the original as `cause`
// so nothing is lost when a library throws a string or a plain object.
export function toError(caught: unknown): Error {
  if (caught instanceof Error) return caught;
  if (typeof caught === "string") return new Error(caught);
  return new Error("Non-Error value thrown", { cause: caught });
}

// A cancelled fetch (AbortController) rejects with an AbortError. That is an
// *expected* outcome of cleanup, not a failure, so callers usually skip it.
export function isAbortError(caught: unknown): boolean {
  return caught instanceof DOMException && caught.name === "AbortError";
}

// A failure the UI is expected to handle (bad input, 404, 409...). Throwing a
// dedicated class lets callers tell it apart from bugs with `instanceof`.
export class HttpError extends Error {
  override name = "HttpError";
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`Request to ${url} failed with ${status}`);
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

// Turn a promise that may reject into a value that cannot. The caller has to
// check `ok` before reaching `value`, so forgetting the error path is a type
// error instead of an unhandled rejection.
export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (caught) {
    return { ok: false, error: toError(caught) };
  }
}

// fetch only rejects on network failure - a 404 or 500 *resolves*. Check `ok`
// and throw, so HTTP failures take the same path as network failures.
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new HttpError(res.status, url);
  return (await res.json()) as T;
}

// One place to send errors to monitoring (Sentry, Datadog, your own endpoint).
// Swap the console call for your reporter; keep the call sites unchanged.
export function logError(error: Error, context: Record<string, unknown> = {}): void {
  console.error("[app error]", error, context);
}
