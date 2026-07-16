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

## Summary

- Prefer inference over explicit type arguments - design signatures so
  callers never need to spell types out.
- Constrain type parameters to the smallest shape the body actually uses.
- A type parameter should connect two or more positions; otherwise drop it.
- `infer` in a conditional type extracts types from structures and powers the
  standard-library utilities.
