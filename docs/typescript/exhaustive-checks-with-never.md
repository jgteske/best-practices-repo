# Exhaustiveness Checks with `never`

Unions, string-literal types, and `enum`s all share the same long-term risk:
someone adds a new member six months from now, and every `switch` or `if`
chain written *before* that member existed silently keeps compiling - and
silently does the wrong thing at runtime, usually by falling through a
`default` branch that was written for a different purpose. `never` turns
that silent runtime gap into a loud compile-time error.

## Why `never` is the right tool

`never` is TypeScript's type for "a value that cannot exist." A function
parameter typed `never` can only be called if the compiler has already
narrowed away every other possibility - which is exactly the situation at
the bottom of a `switch` that has handled every member of a union. If a case
is missing, the value flowing into that spot is *not* `never` - it's
whatever member was left unhandled - and passing it to a `never` parameter
is a type error.

<<< ../../examples/typescript/exhaustive-checks/assert-never.ts

The pattern is the same regardless of what kind of union is being switched
over:

- a **discriminated union** (`{ type: "succeeded"; ... } | { type: "failed"; ... }`),
- a **string-literal union** (`"pending" | "shipped" | ...`), often used
  instead of a native `enum`,
- or a native **`enum`**.

In every case: `switch` on the discriminant, handle every known case
explicitly, and end with `default: return assertNever(value)`.

## Alternative: `Record<Union, T>` for simple lookups

When the goal is a simple value-per-case mapping rather than branching
logic, a `Record` gets exhaustiveness checking without any helper function -
TypeScript already refuses to compile a `Record<K, T>` object literal that's
missing a key of `K`:

<<< ../../examples/typescript/exhaustive-checks/exhaustive-record.ts

Use whichever fits the shape of the problem:

| Situation | Use |
| --- | --- |
| Different logic/branches per case | `switch` + `assertNever` |
| A label, color, icon, or other single value per case | `Record<Union, T>` |

## Common mistakes that defeat the check

- **Adding a `default` that returns a fallback value instead of calling
  `assertNever`.** This is the most common way exhaustiveness checking gets
  quietly disabled - the `default` branch "handles" the new case by
  returning something plausible, so nothing ever breaks, and the missing
  case ships silently.
- **Using `if`/`else if` without a final `else` that calls `assertNever`.**
  Without the final `else`, there's nothing forcing the compiler to check
  that every branch was covered.
- **Widening the parameter type of `assertNever`'s caller.** If the value
  passed to `assertNever` was cast to `any` or `as SomeType` anywhere on the
  way there, the exhaustiveness check is bypassed - `any` is assignable to
  `never` without complaint.

## Summary

- Write `function assertNever(x: never): never { throw ... }` once, reuse it
  everywhere.
- End every `switch` over a union/enum with `default: return assertNever(value)`.
- For simple per-case values, prefer a `Record<Union, T>` - it's exhaustive
  by construction, no helper needed.
- Never "handle" the default case with a fallback value - that's what turns
  off the safety net.
