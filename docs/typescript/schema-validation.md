# Schema Validation with zod

Types vanish at runtime. Anything that crosses into your program, such as JSON from an
API, environment variables, form input or a message from a queue, is `unknown`
until something checks it. [Type-Safe Validation](./type-safe-validation)
shows how to write that check by hand with type guards. This page covers the
next step: a **schema library**. You write the schema once, and get both the runtime check
and the static type from it.

The examples use [zod](https://zod.dev) (v4). Valibot, ArkType and Effect
Schema follow the same pattern with different trade-offs in bundle size and syntax.

## One schema, both the check and the type

<<< ../../examples/typescript/validation/zod-schemas.ts

```
member
✖ Too small: expected number to be >0
  → at id
✖ Invalid email address
  → at email
✖ Too small: expected string to have >=1 characters
  → at name
false
deleted 7
31
false
```

- **`z.infer<typeof Schema>`** derives the type. There is no `interface User`
  to keep in sync. Change the schema and the type follows.
- **`parse`** returns typed data or throws. **`safeParse`** returns
  `{ success, data } | { success, error }`, a Result like the ones in
  [Error Handling](./error-handling). Use `safeParse` when bad input is expected.
- **Every** problem is reported, each with a path, and not just the first.
  `z.prettifyError` turns them into the messages above.
- **Unknown keys are stripped** by default, so extra fields from a client can't
  sneak through to your database layer. Use `z.strictObject` to reject them
  instead.
- **Derive variants** with `omit`, `pick`, `partial`, `extend` and `required`
  instead of writing near-duplicate schemas for "create" and "update".
- **`z.discriminatedUnion`** validates and narrows like the
  [hand-written unions](./modeling-with-unions).
- **Transforms change the type**: `z.input<>` is what you accept, and
  `z.output<>` (the same as `z.infer`) is what you get back.

## Parse at the boundary, trust inside

Validate where data **enters** the program, once, and pass typed values
everywhere else. Two boundaries every application has:

<<< ../../examples/typescript/validation/parse-at-boundaries.ts

```
8081 [ 'beta', 'dark' ]
invalid environment:
✖ Invalid input: expected number, received NaN
  → at PORT
✖ Invalid input: expected string, received undefined
  → at DATABASE_URL
sent to ada@example.com
orders.0.status
```

- **Environment variables** are all strings or missing. `z.coerce.number()`,
  `.default()` and `.transform()` produce a real config object. Validating at
  startup means a misconfigured deploy fails **immediately, listing every
  problem**, instead of crashing on the first request that reads `PORT`.
- **API responses**: `OrdersResponseSchema.parse(await res.json())` replaces
  `as Order[]`. A cast is a promise you can't keep, while a parse is a check. When
  the server adds a status your client doesn't know, you get
  `orders.0.status` at the boundary, not `undefined is not a function` three
  components later.
- **`.brand<"Email">()`** makes "has been validated" part of the type, like the
  hand-written [branded types](./type-safe-validation#branded-types-making-validated-a-distinct-type).
  A plain string can't be passed where an `Email` is required.

## Hand-written guards or a schema?

| | Type guards | Schema library |
| --- | --- | --- |
| Dependencies | none | one (`zod/mini` exists when bundle size matters) |
| Type and check from one source | only with discipline (`as const` arrays) | always |
| Error reports | whatever you write | every issue, with paths |
| Coercion and transforms | by hand | built in |
| Best for | a few small shapes, hot paths, libraries | API payloads, config, forms, anything nested |

A good default: use schemas at the edges of an application, and type guards for small
internal checks.

## Summary

- Derive types from schemas with `z.infer`. Don't maintain both by hand.
- Parse once, at the boundary (env, HTTP, storage, user input), and pass typed data inward.
- Use `safeParse` when bad input is expected, and report every issue.
- Use `.brand()` when "validated" should be visible in the type.
