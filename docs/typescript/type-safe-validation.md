# Type-Safe Validation of Enums, Unions, and External Data

Compile-time types disappear at runtime. Anything that crosses a boundary -
an HTTP response, `JSON.parse`, a form field, an environment variable - is
`unknown` (or, worse, `any`) until something actually checks it. This page
covers three complementary techniques for making that check as strong as
the type system it's feeding into: **type guards**, **branded types**, and
**`satisfies`** - plus how `never`-based exhaustiveness (see
[Exhaustive Checks with `never`](./exhaustive-checks-with-never)) reinforces
all three.

## Type guards for enums and discriminated unions

A type guard is a function whose return type is a **type predicate**
(`value is T`). Callers that check `if (isX(value))` get `value` narrowed to
`T` inside that branch - no cast required.

<<< ../../examples/typescript/validation/type-guards.ts

Two things worth calling out:

- `isOrderStatus` is built from the **same `as const` array** that produces
  the `OrderStatus` union (see
  [Derive Types with `typeof`](./derive-types-with-typeof)) - the list of
  allowed values and the type describing them come from one source, not two.
- `isShape`'s internal `switch` mirrors the exhaustive `switch` in
  `computeArea`. They're validating two different things (runtime shape vs.
  compile-time coverage), but keeping them structurally parallel means a new
  `Shape` variant is a prompt to update both, not a place where one gets
  forgotten.

## Branded types: making "validated" a distinct type

Structural typing means `type EmailAddress = string` is fully
interchangeable with any other `string` - once validated, a value is
indistinguishable from one that never was. **Branding** attaches a marker
property (backed by a `unique symbol`, so it can't be forged) that only the
validating function can produce:

<<< ../../examples/typescript/validation/branded-types.ts

The payoff shows up at call sites: two `string`-shaped parameters that are
easy to accidentally swap (`to: EmailAddress, userId: UserId`) become a
compile error when swapped, instead of a bug that only surfaces when an
email gets sent to `usr_4f8a9c21@`.

Reach for a brand when a plain primitive type is too permissive for what the
value is actually supposed to represent - IDs, validated emails, non-empty
strings, currency amounts in a specific unit - and where accidentally
substituting an unvalidated value would be a real bug, not just untidy.

## `satisfies`: validate without widening

Both a bare object literal and a `: Type`-annotated object literal have
trade-offs: the bare literal isn't checked against anything, and the
annotated one is checked but widens every value to the annotation's types
(`"/"` becomes `string`). `satisfies` checks the literal against a type
*and* keeps the literal's own inferred type:

<<< ../../examples/typescript/validation/satisfies-operator.ts

Use `satisfies` whenever a literal needs to be validated against a shape
(exhaustive keys, correct value types) but the code that consumes it
benefits from knowing the specific literal values - autocomplete on a
specific route string, a discriminated union tag, a specific numeric
literal - rather than the widened general type.

## How these fit together

| Technique | Answers |
| --- | --- |
| `value is T` type guard | "Is this `unknown` value actually a `T`?" |
| Branded type | "Has this value already been validated as a `T`, as opposed to merely being the same primitive type?" |
| `satisfies` | "Does this literal match `T`, without losing the literal's own type?" |
| `never` / `assertNever` | "Have I handled every member of this union, both now and after it grows?" |

They compose: a type guard's internal `switch` can (and should) end in
`assertNever`, a branded type's parsing function is a type guard by another
name, and a `satisfies`-checked config map is a natural place to store the
allowed values a type guard checks against.

## Summary

- Validate `unknown` input with a `value is T` type guard, not a cast.
- Brand primitive types (`EmailAddress`, `UserId`, ...) when "already
  validated" needs to be a distinct type from "same primitive, unchecked."
- Prefer `satisfies Type` over `: Type` for literals whose specific values
  matter to consumers - it checks without widening.
- Keep runtime validators and compile-time exhaustiveness checks
  structurally parallel so a new union member prompts updates to both.
