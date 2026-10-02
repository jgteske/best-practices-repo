# Generics In-Depth

Generics are how you write code that's reusable *without* giving up type
information. The goal is always the same: let the compiler **infer** types
from the call site, and **constrain** type parameters just enough that the
body type-checks - no more.

## Infer at the call site, constrain what you use

<<< ../../examples/typescript/generics/inference-and-constraints.ts

Key ideas:

- **`K extends keyof T`** ties a key argument to an object argument, so the
  return type is the *exact* property type - not a widened union.
- **Constrain to a shape** (`T extends { length: number }`), not a concrete
  type, to stay general while letting the body read the fields it needs.
- **Default type parameters** (`<T = string>`) give a sensible fallback that
  callers can still override.

::: tip The two-position rule
A type parameter should relate at least two positions - an argument to the
return type, or two arguments to each other. A `<T>` that appears in exactly
one spot buys nothing over a plain type like `unknown` and just adds noise.
:::

## Conditional types and `infer`: compute types from types

`T extends U ? X : Y` with `infer` lets you pull a type *out* of a larger
structure. This is exactly how the built-in `ReturnType`, `Parameters`, and
`Awaited` are implemented - and you can build your own.

<<< ../../examples/typescript/generics/conditional-infer.ts

Two behaviors worth internalizing:

- **Recursion**: a conditional type can reference itself (`DeepAwaited`)
  to peel away nested layers.
- **Distribution**: a conditional type applied to a *union* runs per member,
  which is how `NonNullableUnion` filters `null`/`undefined` out of a union.

See also [Derive Types with `typeof`](./derive-types-with-typeof) for using
the built-in helpers, and [Mapped & Conditional Types](./mapped-and-conditional-types)
for building your own utility types on top of these primitives.

## Steering inference

Sometimes the compiler infers something **too wide**, infers from the **wrong
argument**, or needs to know **how** a type parameter is used. TypeScript has a
tool for each case:

<<< ../../examples/typescript/generics/advanced-inference.ts

### `const` type parameters (5.0)

`<const T extends readonly string[]>` asks for the narrowest type of an
argument literal, here the tuple `readonly ["/", "/about"]` instead of
`string[]`. Callers no longer need to remember `as const`. The constraint should
be `readonly`, because a `const` type parameter infers readonly tuples.

### `NoInfer<T>` (5.4)

When `T` appears in several parameters, *every* argument becomes a candidate
for inferring it. In `createSelectLoose`, the typo `"medum"` simply becomes a
member of `T`, so it is no longer an error. Wrapping a position in
`NoInfer<T>` means that position is **checked** against `T` but does not
**contribute** to it. Use it for defaults, initial values and fallbacks.

### One parameter or two?

With one `T` for two arguments, TypeScript picks one candidate (here, the first
argument) and checks the other against it. If the arguments are allowed to differ,
give each its own type parameter (`pairOf<A, B>`) and don't widen to a union.

### Variance annotations (4.7)

`out T` declares that `T` is only **produced** (covariant: a
`Producer<number>` can be used as a `Producer<number | string>`). `in T`
declares that it is only **consumed** (contravariant: the reverse). The compiler
verifies the annotation against the type's members, and for large generic types
it speeds up checking. You will mostly *read* these in library typings rather
than write them.

::: warning Method syntax is bivariant
`accept(value: T): void` (method syntax) is checked **bivariantly** even under
`strict`, so unsound assignments slip through. `accept: (value: T) => void`
(property syntax) gets the full `strictFunctionTypes` check. Prefer property
syntax for callback members in interfaces you write.
:::

### When not to reach for a generic

`logAllBad<T>(items: T[])` uses `T` once, so it relates nothing. `readonly
unknown[]` says the same thing and reads better. Generics also aren't a way to
avoid deciding on a type. If every caller passes the same type, use that type.

## Summary

- Prefer inference over explicit type arguments - design signatures so
  callers never need to spell types out.
- Constrain type parameters to the smallest shape the body actually uses.
- A type parameter should connect two or more positions; otherwise drop it.
- `infer` in a conditional type extracts types from structures and powers the
  standard-library utilities.
- `const` type parameters keep literals, `NoInfer` stops a position from widening `T`, and two parameters are better than a widened union.
- Write callback members with property syntax, so they get strict (not bivariant) checking.
