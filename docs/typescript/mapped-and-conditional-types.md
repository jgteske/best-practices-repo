# Mapped & Conditional Types

Once you understand mapped types, the standard library stops being magic:
`Partial`, `Required`, `Readonly`, `Pick`, and `Record` are all a few lines
of mapped-type code. Learning to write your own lets you express
transformations the built-ins don't cover - and keeps types derived from a
single source instead of hand-maintained.

## Build your own utility types

A mapped type iterates the keys of one type to produce another. Modifiers
(`readonly`, `?`, and their `-` removers) and key remapping via `as` are the
whole toolkit.

<<< ../../examples/typescript/mapped-types/build-your-own.ts

The two advanced moves here are worth calling out:

- **Key remapping with `as`** transforms the *keys*, not just the values -
  turning `id` into `getId`, for example, with the built-in `Capitalize`
  string type.
- **Filtering keys** by remapping unwanted keys to `never` (which drops
  them). `KeysOfType<Account, number>` keeps only the numeric fields.

## Recursion: go all the way down

The built-in `Readonly<T>` is **shallow** - it freezes the top level but
leaves nested objects and arrays mutable. A recursive mapped type applies the
transformation at every level, which is what you actually want for config and
immutable state.

<<< ../../examples/typescript/mapped-types/deep-readonly.ts

The recursion terminates at primitives (the `: T` branch), because they're
already immutable. The same shape - array case, object case, primitive base
case - underlies most "deep" utility types (`DeepPartial`, `DeepRequired`,
and so on).

::: warning Don't over-engineer types
Deep recursive types are impressive but cost compile time and can produce
error messages that are hard to read. Prefer a shallow built-in when it's
enough, and reach for the recursive version only where nested immutability
genuinely matters.
:::

## Summary

- A mapped type iterates `keyof T`; modifiers (`?`, `readonly`, and their
  `-` removers) reshape each property.
- Key remapping with `as` renames or filters keys - remap to `never` to drop
  one.
- Recursive mapped types apply transformations at every nesting level, unlike
  the shallow built-ins.
- Derive utility types from a source type instead of hand-writing parallel
  definitions that can drift.
