# Async & Promise Patterns

Async code is where type safety most often quietly leaks: a dropped promise
swallows an error, a loop that looks parallel runs serially, and the wrong
combinator hands you a value shape you didn't expect. TypeScript can catch
all three if you let it.

## Never let a promise float

A "floating" promise is one that's neither awaited nor has a `.catch()`. If
it rejects, you get an unhandled rejection with no stack pointing at the
caller, and the surrounding function returns as if the work succeeded.

<<< ../../examples/typescript/async/floating-promises.ts

The fix is to make your intent explicit:

- **Need it to finish first?** `await` it.
- **Genuinely fire-and-forget?** Prefix with `void` *and* attach a `.catch()`
  so a rejection can't escape.

Enable [`@typescript-eslint/no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/)
to have the linter flag every unhandled promise for you.

::: tip Parallel vs sequential
`await` inside a `for` loop runs iterations **one at a time**. If the
iterations are independent, start them all first and `await Promise.all(...)`
- often a multiplier on throughput for free. The example file shows both.
:::

## Pick the combinator whose result type you want

`all`, `allSettled`, `race`, and `any` differ in *when they settle* and in
*what type they resolve to*. Reading the result type is the fastest way to
pick the right one.

<<< ../../examples/typescript/async/promise-combinators.ts

| Combinator | Rejects when | Resolves to | Use when |
| --- | --- | --- | --- |
| `Promise.all` | any input rejects | `T[]` | you need every result; fail fast |
| `Promise.allSettled` | never | `PromiseSettledResult<T>[]` | partial success is fine; you want every outcome |
| `Promise.race` | first settle rejects | `T` | timeouts; first-to-finish wins |
| `Promise.any` | all reject (`AggregateError`) | `T` | first *success* wins |

Note how `allSettled` returns a **tagged union** per input - you must narrow
on `.status` before touching `.value` or `.reason`, exactly the discipline
that prevents "why is this `undefined`" bugs.

## Summary

- Every promise should be awaited, returned, or `void`-ed with a `.catch()`.
- Independent async work belongs in `Promise.all`, not a sequential loop.
- Choose the combinator by the guarantee (and result type) you need.
- Type your errors: `allSettled`'s per-item union forces you to handle
  failures explicitly.
