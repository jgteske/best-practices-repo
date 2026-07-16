# Template Literal Types

A plain `string` accepts any string. Template literal types let you describe
the **shape** a string must have - a prefix, a set of allowed combinations, a
route with named parameters - so malformed strings are rejected at compile
time. They're also the foundation of type-safe routers, event systems, and
CSS-in-TS libraries.

## Give strings structure

<<< ../../examples/typescript/template-literals/typed-strings.ts

Three techniques are on display here:

- **Constrain a format**: ``type UserId = `user_${string}` `` accepts only
  strings with the right prefix.
- **Generate combinations**: crossing two unions
  (``` `${Color}-${Shade}` ```) produces every valid token automatically, so
  the set can never drift from its parts.
- **Extract structure back out**: `infer` inside a conditional template type
  pulls a piece (like the HTTP method) out of a larger string type.

## Derive a params object from a route

The pattern behind type-safe routing: parse a route string *at the type
level* into the exact params object it requires. Declare the route once and
the params are checked against it - no duplicated `{ id: string }` to keep in
sync.

<<< ../../examples/typescript/template-literals/route-params.ts

`navigate("/users/:id", {})` fails to compile because `id` is missing;
passing an unknown key fails too. The route string *is* the schema.

::: warning Keep recursion shallow
Recursive template types (like the route parser) are powerful but can hit the
compiler's instantiation-depth limit on very long inputs, and they slow down
type-checking if overused. Reach for them for genuinely structural strings -
routes, event names, keys - not as a substitute for ordinary validation.
:::

## Summary

- Use template literal types to encode a string's format instead of settling
  for `string`.
- Cross unions to generate valid-combination types that stay in sync with
  their parts.
- Use `infer` in conditional template types to parse structure out of
  strings (methods, params, prefixes).
- These types power type-safe routers and event maps - the route or event
  name becomes the single source of truth.
