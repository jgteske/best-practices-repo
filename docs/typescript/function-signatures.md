# Function Signatures: Overloads & Assertions

Most functions need only a single, well-typed signature. But two situations
call for more expressive tools: when the **return type depends on which
argument type** was passed (overloads or a conditional return), and when a
function **proves a fact about its argument** to the type system (assertion
signatures).

## Overloads vs. union parameters

Reach for a **union parameter** first - it's simpler and the compiler checks
the body against every case. Use **overloads** only when a single signature
can't express the relationship between the argument and the return type.

<<< ../../examples/typescript/function-signatures/overloads-vs-unions.ts

- `area(...)` takes a union and returns one type - no overloads needed.
- `double(...)` genuinely benefits from overloads: a `number` in yields a
  `number` out, a `string` in yields a `string` out. A plain
  `number | string` return couldn't express that correlation.
- The modern alternative is a **generic with a conditional return type**
  (`double2`), which often reads better and composes more cleanly than a
  stack of overloads.

::: warning The implementation signature is private
The signature on the function *implementation* (the one with the body) is not
visible to callers - only the overload signatures above it are. Keep the
implementation signature broad and the body defensive.
:::

## Assertion signatures: prove facts to the compiler

A type guard returns a boolean you branch on. An **assertion signature**
(`asserts x is T` or `asserts condition`) instead narrows types for all code
*after* the call - the function either returns, having proven the fact, or
throws.

<<< ../../examples/typescript/function-signatures/assertion-signatures.ts

- `asserts condition` narrows based on a boolean expression - after
  `assert(text !== undefined, ...)`, `text` is `string`.
- `asserts x is T` proves a specific type for the argument itself, so
  `data` becomes `number[]` for the rest of the function.

Assertion signatures **require an explicit return-type annotation** -
TypeScript won't infer `asserts`. That explicitness is the point: you're
vouching for something the compiler can't verify on its own, so keep the
runtime check and the asserted type in lockstep.

## Summary

- Default to a single signature with union parameters; it's the simplest
  thing that works.
- Use overloads (or a conditional-return generic) only when the return type
  is correlated with the argument type.
- Keep the implementation signature broad - callers never see it.
- Use assertion signatures for `assert`-style helpers that narrow types by
  throwing; annotate them explicitly.
