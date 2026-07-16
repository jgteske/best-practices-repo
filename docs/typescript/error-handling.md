# Error Handling: Result Types & Typed `catch`

`throw` is invisible to the type system. A function's signature never tells
you what it can throw, and in strict mode every `catch` binding is `unknown`.
That's fine for *truly exceptional* failures, but for **expected** ones -
validation, not-found, parse errors - putting the failure in the return type
lets the compiler force callers to handle it.

## Return a `Result` for expected failures

A `Result<T, E>` is a discriminated union: either a value or an error, never
both, never neither. The caller can't reach the value without first checking
the `ok` discriminant.

<<< ../../examples/typescript/error-handling/result-type.ts

Two things make this pattern pleasant in practice:

- **Tiny `ok` / `err` constructors** keep call sites readable.
- **Errors as a tagged union** (not a class hierarchy) are easy to `switch`
  over exhaustively and survive serialization across a network boundary.

::: tip When to still `throw`
Use `Result` for failures that are part of a function's normal contract. Keep
`throw` for programmer errors and unrecoverable situations (out of memory,
invariant violations) - things no caller can sensibly recover from.
:::

## When you do catch, narrow before you use

Because JavaScript can throw *anything*, strict mode types the catch binding
as `unknown`. Don't fight it with `as` - narrow it with a type guard.

<<< ../../examples/typescript/error-handling/typed-catch.ts

The guard turns `unknown` into a concrete type safely, and it handles the
cases people forget: a thrown string, a thrown plain object, a rejected
non-`Error`. `String(caught)` is the safe fallback for the truly unknown
tail.

## Summary

- Model expected failures as data in a `Result<T, E>` return type, not as
  thrown exceptions.
- Represent error cases as a tagged union so callers can handle them
  exhaustively.
- Reserve `throw` for unrecoverable, exceptional conditions.
- In `catch`, treat the binding as `unknown` and narrow with a type guard
  before touching it.
