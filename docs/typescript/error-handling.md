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

## Compose Results instead of nesting `if`s

A `Result` is only pleasant when you can chain it. Four small helpers cover
almost every call site. `map` transforms a success, `andThen` chains a step that
can itself fail, `unwrapOr` supplies a fallback, and `tryCatch` / `fromPromise`
convert a throwing API into a `Result` **once, at the boundary**:

<<< ../../examples/typescript/error-handling/result-helpers.ts

```
{ ok: true, value: ':8080' }
{ ok: false, error: { kind: 'invalidJson', message: "Expected property name or '}' in JSON at position 1 (line 1 column 2)" } }
{ ok: false, error: { kind: 'badPort', port: '80' } }
:3000
failed: offline
```

- `andThen`'s return type is `Result<U, E | F>`, so the error types of each
  step **accumulate in the union**. The final `switch` on `error.kind` is
  checked against every way the pipeline can fail.
- `JSON.parse` throws, so it is wrapped exactly once, in `parseJson`. Nothing
  downstream needs a `try`.
- If you need more than these helpers (`combine`, async chains, generator
  syntax), libraries like `neverthrow` and `Effect` are built on the same idea.

## When you throw: subclasses, `cause`, and `AggregateError`

Exceptions are still right for failures the caller can't handle locally, like an
unreachable database or a broken invariant. When you throw, make the errors
**identifiable** and **keep their history**:

<<< ../../examples/typescript/error-handling/error-classes.ts

```
user 42
404: user missing
loading user boom failed (cause: TypeError: socket closed)
2 of 3 channels failed 2
```

- **One base class** (`AppError`) lets callers catch everything you throw on
  purpose without also catching real bugs. Set `name` on each subclass so that
  logs and stack traces say `NotFoundError`, not `Error`.
- **`instanceof` narrows `unknown`** to the subclass, including its extra
  fields (`resource`, `id`). Data on the error beats parsing `message`.
- **`new Error(msg, { cause })`** (ES2022) wraps a low-level error without losing
  it. Node and browsers print the cause chain with both stack traces.
- **`AggregateError`** carries several failures at once. That's the natural
  result of `Promise.allSettled` and the error `Promise.any` throws.
- **Rethrow what you don't recognise.** A `catch` that handles some errors
  must not silently swallow the rest.

::: tip Tagged unions or classes?
Use **tagged unions in a `Result`** for expected failures the immediate caller
should handle. They are plain data, exhaustively checkable and serializable. Use
**`Error` subclasses** for things that propagate up several layers to a
generic handler, because only those carry a stack trace.
:::

## Summary

- Model expected failures as data in a `Result<T, E>` return type, not as
  thrown exceptions.
- Represent error cases as a tagged union so callers can handle them
  exhaustively.
- Reserve `throw` for unrecoverable, exceptional conditions.
- In `catch`, treat the binding as `unknown` and narrow with a type guard
  before touching it.
- Compose Results with `map` / `andThen`, and convert throwing APIs with `tryCatch` at the boundary.
- When throwing, use an `AppError` hierarchy, set `name`, wrap with `{ cause }`, and use `AggregateError` for many.
