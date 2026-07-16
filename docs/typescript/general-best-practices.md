# General TypeScript Best Practices

A catalog of smaller, broadly-applicable practices that don't each need a
full page. Each section is short and links to a runnable example where one
exists.

## Turn on strict mode - all of it

`"strict": true` in `tsconfig.json` bundles several checks
(`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`,
`strictBindCallApply`, `strictPropertyInitialization`, ...) that catch the
majority of real-world TypeScript bugs. Turning it on for an existing loose
codebase is real work; turning it off (or never turning it on) trades that
one-time cost for a permanent stream of `undefined is not an object`-style
runtime errors instead. A few more flags worth enabling alongside it:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true, // arr[i] is T | undefined, not T
    "exactOptionalPropertyTypes": true, // { a?: string } rejects { a: undefined }
    "noImplicitOverride": true, // subclass methods must say `override`
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## `unknown` over `any` at every boundary

`any` isn't "I don't know the type" - it's "stop checking types for this
value and everything derived from it." `unknown` says the first thing
honestly while still requiring a check before use.

<<< ../../examples/typescript/general/unknown-vs-any.ts

## Prefer `readonly` and `as const`

Mutation of shared state is one of the most common sources of bugs that are
hard to trace back to their cause, because the mutation and the symptom can
be arbitrarily far apart in the codebase. Marking data `readonly` (on
interface properties, on array parameters, or on literals via `as const`)
turns "please don't mutate this" from a comment into a compiler-enforced
rule.

<<< ../../examples/typescript/general/readonly-immutability.ts

## Reach for built-in utility types before writing a new interface

`Partial`, `Pick`, `Omit`, `Required`, `Record`, `Exclude`, and friends
derive a new type from an existing one. Using them keeps every variant of a
type mechanically tied to the original, so a field rename or addition
propagates everywhere automatically instead of requiring a manual sweep
across several hand-written near-duplicate interfaces.

<<< ../../examples/typescript/general/utility-types.ts

## Constrain generics; don't leave them open

An unconstrained `<T>` tells the reader (and the compiler) nothing about
what the function actually needs from `T`. Constrain it to the minimum
shape required - this documents intent, produces better error messages at
call sites, and often removes the need for internal casts.

<<< ../../examples/typescript/general/generics-constraints.ts

## Model state with discriminated unions, not boolean flags

```ts
// Anti-pattern: which combinations of these three booleans are actually
// valid? Nothing stops `{ isLoading: true, isError: true, data: {...} }`,
// a combination that shouldn't be reachable but compiles fine.
interface RequestStateBad {
  isLoading: boolean;
  isError: boolean;
  data?: unknown;
  error?: string;
}

// Recommended: the union only allows the combinations that make sense.
// Accessing `.data` or `.error` outside the matching branch is a compile
// error, and a `switch` on `status` gets exhaustiveness checking (see
// "Exhaustive Checks with never").
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```

Reach for this whenever a piece of state has "modes" that carry different
data - loading states, wizard steps, parsed results that can succeed or
fail. It's the same idea as the payment/order examples in
[Exhaustive Checks with `never`](./exhaustive-checks-with-never), applied to
UI/application state instead of domain events.

## String-literal unions over `enum`, by default

```ts
// A native TS enum compiles to a runtime object and (for numeric enums)
// allows any number to be assigned where the enum type is expected.
enum ColorEnum {
  Red,
  Green,
  Blue,
}
function paintBad(c: ColorEnum) {}
paintBad(99); // compiles: any number is assignable to a numeric enum

// A string-literal union has no runtime footprint, and only the exact
// listed values are assignable.
type Color = "red" | "green" | "blue";
function paint(c: Color) {}
// paint("Red");  // <- compile error: wrong case, not a valid Color
// paint("puce"); // <- compile error: not a valid Color
```

Native `enum`s still have a place - typically when a stable, well-known
numeric or string runtime value needs to be shared across a serialization
boundary (a wire protocol, a database column) and the extra runtime object
is actually wanted. For everything else - internal state machines, function
parameters restricted to a fixed set of values - a string-literal union
paired with an `as const` array (see
[Derive Types with `typeof`](./derive-types-with-typeof)) gives the same
safety with no runtime cost and no numeric-enum loophole.

## Naming and module organization

- **Avoid `namespace`.** ES modules (`import`/`export`) are the standard;
  `namespace` predates them and mixing the two is a common source of
  confusing merge/resolution behavior. Reach for it only when maintaining
  legacy code that already depends on it (e.g. augmenting a global that a
  third-party non-module script relies on).
- **Avoid barrel files (`index.ts` that re-exports everything) for large
  modules.** They feel convenient but force bundlers and the TS compiler to
  load every file in the barrel to resolve a single import, which shows up
  as real build-time and IDE-latency cost as a codebase grows. Import
  directly from the specific file instead.
- **Name booleans as predicates** (`isLoading`, `hasError`, `canEdit`), not
  bare nouns (`loading`, `error` used as a boolean) - `hasError` reads
  correctly at every call site (`if (hasError)`), where `error` as a boolean
  is easy to confuse with "the error value itself."
- **Suffix type-only exports that mirror a runtime value** so the
  relationship is visible - `type UserDTO = ReturnType<typeof toUserDTO>` is
  clearer than an unrelated-looking name.

## Prefer composition of small types over deep inheritance

Prefer combining small, focused interfaces (via intersection types
`A & B`, or by taking several narrow parameters) over deep class hierarchies
or large interfaces with many optional fields. Small pieces are easier to
reuse across unrelated shapes, and TypeScript's structural typing rewards
composition - two independently-defined shapes that happen to match are
already interchangeable, without any shared base class required.

## Summary

- Turn on `strict` and the handful of complementary flags above; treat
  loosening any of them as a deliberate, reviewed exception, not a default.
- Default to `unknown`, `readonly`, string-literal unions, and discriminated
  unions; reach for `any`, mutable state, numeric `enum`, and boolean-flag
  state only when there's a specific reason to.
- Derive types from other types (utility types) and from values (`typeof`,
  covered on its own page) instead of hand-writing near-duplicates.
- Keep module boundaries small and explicit - avoid `namespace` and
  large barrel files.
