# Props & Passing Parameters

In React, "passing parameters" to a component *is* passing props. The value of
typing them well is that the **call site** gets checked: a missing, misspelled,
or wrongly-typed prop becomes a compile error instead of a blank screen.

## Type props precisely

Narrow types do double duty - they prevent bugs and drive autocomplete at the
call site.

<<< ../../examples/react/props/typing-props.tsx

Notice the two small but high-value choices:

- **`kind?: "text" | "email" | "password"`** instead of `kind?: string`.
  Callers can only pass real options, and their editor suggests them.
- **`onChange: (next: string) => void`** instead of leaking the DOM event. The
  component adapts `e.target.value` internally, so consumers work with a clean,
  domain-shaped callback.
- **`readonly string[]`** signals "I won't mutate what you pass me."

## Make illegal prop combinations impossible

When props are only valid *together*, a flat bag of optionals lets callers build
nonsense (`as="link"` with an `onClick` and no `href`). Model the variants as a
**discriminated union** and the compiler rejects the bad combinations outright:

<<< ../../examples/react/props/discriminated-props.tsx

Inside each `if` branch, TypeScript narrows to exactly the props that variant
allows - so the implementation is checked too, not just the call site. This is
the React application of
[Make Illegal States Unrepresentable](/typescript/modeling-with-unions).

## Compose instead of drilling

Threading a prop through five layers that don't use it ("prop drilling") is a
smell. Prefer **composition**: let callers pass JSX through `children` or named
slots, so intermediate components stay generic and ignorant of the content.

<<< ../../examples/react/props/composition-children.tsx

`Card` knows nothing about invoices or export buttons - the caller composes
them in. When you *do* need to share data across a deep tree, reach for
Context, but try composition first; it solves more cases than people expect.

::: tip `React.ReactNode` is the type for "renderable"
Use `React.ReactNode` for anything you'll place inside JSX (`children`, slots).
It already covers elements, strings, numbers, arrays, and `null` - don't invent
a narrower type and accidentally exclude valid inputs.
:::

## Summary

- Type props with **unions and domain-shaped callbacks**, not bare `string` and
  raw DOM events.
- Use a **discriminated union** when props are only valid in certain
  combinations.
- Prefer **composition via `children`/slots** over drilling props through
  layers that don't use them.
- Use **`React.ReactNode`** for renderable content.
