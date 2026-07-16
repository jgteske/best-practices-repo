# Const Assertions & Enum Alternatives

`as const` is one of the highest-value, lowest-effort features in the
language: it tells the compiler to infer the *narrowest* type - literal
values, `readonly` everything - instead of widening to `string`, `number`,
and mutable arrays. It also underpins the recommended alternative to native
`enum`.

## Prefer `as const` objects over `enum`

Native `enum` has real, well-known drawbacks: numeric enums accept any number
at the type level, `const enum` breaks under isolated/transpile-only builds
(esbuild, Babel, `isolatedModules`), and every enum emits runtime code that
isn't tree-shakeable. An `as const` object plus a derived union gives you the
same call-site ergonomics with none of those issues - and the values stay
plain data you can iterate, serialize, and log.

<<< ../../examples/typescript/const-assertions/as-const-vs-enum.ts

The pattern in one line: **an `as const` object as the source of truth, plus
a union type derived from its values** with `(typeof X)[keyof typeof X]`.
Callers can use `LogLevel.Warn` (refactor-friendly) or the literal `"warn"`
(convenient) - both type-check, and `Object.values(LogLevel)` gives you the
list at runtime, which an enum can't do as cleanly.

## What `as const` actually does

Applied to a literal, `as const`:

- narrows primitives to their **literal type** (`"warn"`, not `string`);
- makes object properties and array elements **`readonly`**;
- turns arrays into **`readonly` tuples**, so `arr[number]` is a precise
  union of the elements.

That last point is why `type Role = (typeof roles)[number]` yields exactly
`"owner" | "admin" | "member"` - the array is the single source of truth for
both the runtime list and the type.

::: tip Pairs well with `satisfies`
Use `satisfies` to validate an `as const` object against a constraint while
keeping the narrow literal types. See
[Type-Safe Validation](./type-safe-validation#the-satisfies-operator).
:::

## Summary

- Reach for `as const` whenever you want literal types, `readonly`
  properties, or tuple inference.
- Model enum-like sets as an `as const` object plus a derived union rather
  than a native `enum`.
- Derive the union from the object (`(typeof X)[keyof typeof X]`) so there's
  one source of truth.
- The values remain ordinary data - iterable, serializable, tree-shakeable.
