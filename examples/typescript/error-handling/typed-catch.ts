/**
 * Handling `catch` correctly when you do use exceptions.
 *
 * In modern TypeScript (`useUnknownInCatchVariables`, on with `strict`) the
 * catch binding is `unknown` - because JS can throw literally anything, not
 * just `Error`. That's a feature: it forces you to narrow before use.
 */

// A user-defined type guard turns `unknown` into something usable, safely.
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// Narrow your own error shapes with a guard rather than casting.
interface HttpError {
  name: "HttpError";
  status: number;
  url: string;
}

function isHttpError(value: unknown): value is HttpError {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    (value as { name: unknown }).name === "HttpError"
  );
}

async function loadProfile(url: string): Promise<string> {
  try {
    // ...fetch that may throw an HttpError or a network Error...
    throw { name: "HttpError", status: 404, url } satisfies HttpError;
  } catch (caught: unknown) {
    // BAD: `caught.message` would not compile - `caught` is `unknown`.
    if (isHttpError(caught)) {
      return `HTTP ${caught.status} for ${caught.url}`;
    }
    if (isError(caught)) {
      return `error: ${caught.message}`;
    }
    // Anything else (a thrown string, number, etc.) - stringify defensively.
    return `unknown failure: ${String(caught)}`;
  }
}

void loadProfile("/me").then(console.log);

export { isError, isHttpError, loadProfile };
export type { HttpError };
