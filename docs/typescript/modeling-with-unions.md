# Make Illegal States Unrepresentable

The single highest-leverage thing you can do with a type system is arrange
your types so that invalid data **cannot be constructed**. When a bad state
can't be typed, you never have to write the runtime check for it, never
have to test it, and never have to debug it in production. Discriminated
unions are the main tool for this.

## The anti-pattern: a bag of optional fields

A type like `{ status; data?; error? }` treats every field as independent.
Nothing stops `status: "loading"` from co-existing with both `data` and
`error` - a state that makes no sense but type-checks fine. Worse, on the
happy path `data` is still `T | undefined`, so every read needs a guard the
compiler can't tell you is redundant.

<<< ../../examples/typescript/discriminated-unions/illegal-states.ts

The union version has one variant per legal state, each carrying exactly the
data that state owns. In the `"success"` branch, `data` is `T` with no `?`;
reaching for `state.error` there is a compile error. The illegal
combinations aren't just discouraged - they're **unspeakable**.

## Discriminant rules of thumb

- Give every variant a **common literal property** (the discriminant):
  `status`, `type`, `kind`, `step` - the name doesn't matter, consistency
  does.
- Use **string literals**, not booleans, for the discriminant once you have
  more than two states - they read better and extend cleanly.
- Put **only** the fields a state actually has in that variant. Resist the
  urge to hoist shared-but-not-universal fields to the top.

## State machines fall out naturally

Once states are a union, a transition is just a function from
`(state, event)` to a new state. Because each state exposes only its own
data, transitions that don't make sense can't even be written.

<<< ../../examples/typescript/discriminated-unions/state-machine.ts

Pair this with the [`assertNever`](./exhaustive-checks-with-never) pattern in
the `switch` and the compiler will also force you to handle every new state
you add later.

## Summary

- Model each distinct state as its own union variant with a literal
  discriminant.
- Store only the data a state actually has - let the happy path have
  non-optional fields.
- Illegal combinations that can't be typed need no runtime checks, no tests,
  and cause no bugs.
- Combine with exhaustive `switch` checks so growth stays safe.
