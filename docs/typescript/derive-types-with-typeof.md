# Derive Types from Values with `typeof` (Instead of Hand-Written Duplicates)

A common anti-pattern: write an `interface`, then separately write a
function or object that's supposed to match it. Nothing forces the two to
stay in sync - the interface is just a promise, and promises drift. The fix
is almost always to flip the order: write the *value* (a function, an
object, a config), then derive its type from it with `typeof`. The compiler
then keeps the type perfectly in sync, forever, for free.

## `ReturnType<typeof fn>` instead of a matching interface

<<< ../../examples/typescript/typeof-patterns/return-type-inference.ts

The failure mode this avoids: someone adds an `issuedAt: Date` field inside
`createInvoice`, forgets the separate `Invoice` interface exists, and now the
interface silently under-describes the real object. Every place that reads
`invoice.issuedAt` either has to add an unsafe cast or duplicates the fix.
With `ReturnType<typeof createInvoice>`, that scenario is structurally
impossible - the type *is* whatever the function returns, always.

This generalizes to a small family of utilities that all pull a type out of
an existing value instead of an existing type:

| Utility | Extracts |
| --- | --- |
| `ReturnType<typeof fn>` | the return type of `fn` |
| `Parameters<typeof fn>` | a tuple of `fn`'s parameter types |
| `Awaited<ReturnType<typeof asyncFn>>` | the resolved value of the promise `asyncFn` returns |
| `InstanceType<typeof SomeClass>` | the instance type produced by `new SomeClass()` |

## `typeof value` instead of a matching interface

<<< ../../examples/typescript/typeof-patterns/config-from-value.ts

Two details make this pattern actually useful rather than merely
convenient:

1. **`as const`** - without it, `spacingScale: [4, 8, 16, 32]` widens to
   `number[]` and `primary: "#1d4ed8"` widens to `string`. `as const` locks
   in literal types and turns the array into a readonly tuple, which is
   almost always what you want for a config-like value.
2. **Indexed access on the derived type** - `(typeof supportedLocales)[number]`
   reads "the type of any element of this array," turning a tuple of string
   literals into the union type you'd otherwise have hand-written (and had
   to remember to update every time an item was added).

## When *not* to do this

`typeof`-derived types are best for **internal, implementation-owned**
shapes: return values, local config, an app's own data structures. They are
the wrong tool for shapes that come from **outside the codebase's control**
- a public API contract, a database schema, a wire format shared with
another team. Those should be declared explicitly (or generated from a
schema/OpenAPI spec/proto file) so the type is a contract the implementation
is checked *against*, not a reflection of whatever the implementation
happens to currently do.

## Summary

- Write the function or value first; derive its type with `ReturnType`,
  `Parameters`, `Awaited`, or plain `typeof` - don't hand-write a parallel
  type that has to be manually kept in sync.
- Reach for `as const` whenever you derive a type from an object or array
  literal, so literal types and tuple shapes survive instead of widening.
- Reserve hand-written interfaces for shapes owned by something *other* than
  the function next to them - external contracts, public APIs, schemas.
