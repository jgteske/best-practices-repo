/**
 * A Result type for expected failures.
 *
 * `throw` is invisible in the type system: a function's signature never tells
 * you what it can throw, and `catch` clauses are typed `unknown`. For
 * *expected* failures (validation, not-found, parse errors) a `Result` puts
 * the failure in the return type, so the compiler forces callers to handle
 * it. Keep `throw` for truly exceptional, unrecoverable situations.
 */

// A discriminated union: either a value, or an error - never both, never
// neither. The `ok` discriminant makes narrowing trivial.
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Tiny constructors keep call sites readable.
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Errors as data: a union of tags is easier to switch over than a class
// hierarchy, and it survives serialization across a network boundary.
type ParseError =
  | { kind: "empty" }
  | { kind: "notANumber"; input: string }
  | { kind: "outOfRange"; value: number; max: number };

function parsePort(input: string): Result<number, ParseError> {
  if (input.trim() === "") return err({ kind: "empty" });

  const value = Number(input);
  if (!Number.isInteger(value)) return err({ kind: "notANumber", input });
  if (value < 1 || value > 65535) {
    return err({ kind: "outOfRange", value, max: 65535 });
  }
  return ok(value);
}

// The caller *cannot* reach `.value` without first checking `.ok` - the
// compiler enforces the happy-path/error-path split.
function describePort(input: string): string {
  const result = parsePort(input);
  if (!result.ok) {
    switch (result.error.kind) {
      case "empty":
        return "no port given";
      case "notANumber":
        return `not a number: ${result.error.input}`;
      case "outOfRange":
        return `${result.error.value} exceeds ${result.error.max}`;
    }
  }
  return `listening on ${result.value}`;
}

console.log(describePort("8080")); // listening on 8080
console.log(describePort("nope")); // not a number: nope

export { parsePort, describePort };
export type { ParseError };
