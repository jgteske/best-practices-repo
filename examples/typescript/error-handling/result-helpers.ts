/**
 * Working with Results: transform, chain, and convert throwing code.
 *
 * A Result is only pleasant if you can compose it. A few small helpers let
 * you transform the success value, chain steps that can each fail, and wrap
 * throwing APIs (JSON.parse, fetch) at the boundary - so the rest of the code
 * never sees an exception for an expected failure.
 */
import { err, ok, type Result } from "./result-type";

// Transform the value, pass errors through untouched.
function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

// Chain a step that can itself fail. The error types accumulate in the union.
function andThen<T, U, E, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

// The boundary: turn a throwing call into a Result exactly once.
function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (caught: unknown) {
    return err(caught instanceof Error ? caught : new Error(String(caught)));
  }
}

async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await promise);
  } catch (caught: unknown) {
    return err(caught instanceof Error ? caught : new Error(String(caught)));
  }
}

// --- a pipeline of steps that can each fail -------------------------------
type ConfigError =
  | { kind: "invalidJson"; message: string }
  | { kind: "missingField"; field: string }
  | { kind: "badPort"; port: unknown };

function parseJson(text: string): Result<unknown, ConfigError> {
  const parsed = tryCatch(() => JSON.parse(text) as unknown);
  return parsed.ok ? parsed : err({ kind: "invalidJson", message: parsed.error.message });
}

function readPort(config: unknown): Result<number, ConfigError> {
  if (typeof config !== "object" || config === null || !("port" in config)) {
    return err({ kind: "missingField", field: "port" });
  }
  const { port } = config;
  return typeof port === "number" && Number.isInteger(port) && port > 0
    ? ok(port)
    : err({ kind: "badPort", port });
}

function loadPort(text: string): Result<string, ConfigError> {
  // Each step runs only if the previous one succeeded; the first error wins.
  return map(andThen(parseJson(text), readPort), (port) => `:${port}`);
}

console.log(loadPort('{"port": 8080}')); // { ok: true, value: ':8080' }
console.log(loadPort("{oops")); // { ok: false, error: { kind: 'invalidJson', ... } }
console.log(loadPort('{"port": "80"}')); // { ok: false, error: { kind: 'badPort', port: '80' } }
console.log(unwrapOr(loadPort("{}"), ":3000")); // :3000

void fromPromise(Promise.reject(new Error("offline"))).then((result) => {
  console.log(result.ok ? result.value : `failed: ${result.error.message}`); // failed: offline
});

export { andThen, fromPromise, map, tryCatch, unwrapOr, loadPort };
export type { ConfigError };
