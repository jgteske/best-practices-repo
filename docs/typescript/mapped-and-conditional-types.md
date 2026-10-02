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

## Derive a union from a map

Keep **one map type** as the source of truth, and generate the union and the
handler types from it:

<<< ../../examples/typescript/mapped-types/remapping-and-distribution.ts

```
paid 20
```

- `{ [K in keyof Events]: { type: K; payload: Events[K] } }[keyof Events]`
  is the most useful idiom on this page. It maps over the keys and then
  **indexes with all keys** to collapse the object into a discriminated union.
  When you add an event to `Events`, both `EventMessage` and `Handlers` grow,
  and the `switch` in `dispatch` stops compiling until it handles the new case.
- ``as `on${Capitalize<K>}` `` remaps `login` to `onLogin`, combining key
  remapping with [template literal types](./template-literal-types).

## Distributive vs non-distributive conditionals

A conditional type whose checked type is a **naked type parameter** distributes
over a union, so it runs once per member. `ToArray<string | number>` is
`string[] | number[]`. Wrap both sides in a one-element tuple
(`[T] extends [unknown]`) to treat the union as a whole, which gives
`(string | number)[]`.

The trap is `never`, the empty union. Distributing over zero members yields
`never` without ever evaluating the branches. A naive `IsNever<never>` is
therefore `never`, not `true`. Testing for `never` (or `any`) always needs the
tuple-wrapped form.

## Recursive types and their limits

`Paths<Settings>` walks an object type and builds every dotted path to a leaf,
such as `"editor.font.size"`. It's handy for typed config getters or i18n keys. Two
things keep recursion like this healthy:

- **A depth counter** (`Depth extends unknown[]`, grown by one element per
  level). It stops infinite expansion on recursive or very deep types. Without
  one, TypeScript gives up with *"Type instantiation is excessively deep and
  possibly infinite"*.
- **Restraint.** Every level multiplies the work the checker does on every
  use. If editor hover types become unreadable or `tsc` slows down, a
  hand-written union is often the better answer.

## Summary

- A mapped type iterates `keyof T`; modifiers (`?`, `readonly`, and their
  `-` removers) reshape each property.
- Key remapping with `as` renames or filters keys - remap to `never` to drop
  one.
- Recursive mapped types apply transformations at every nesting level, unlike
  the shallow built-ins.
- Derive utility types from a source type instead of hand-writing parallel
  definitions that can drift.
- Generate unions and handler types from one map with `{ [K in keyof M]: ... }[keyof M]`.
- Wrap in `[T]` to stop distribution. Always use that form to test for `never`.
- Give recursive types a depth limit.
