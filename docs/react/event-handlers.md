# Event Handlers & Function Chaining

React's `onEvent` props (`onClick`, `onChange`, `onSubmit`, ...) take plain
functions. Two things make them pleasant to work with in TypeScript: **typing
them with React's synthetic event types**, and **composing** small handlers
into the one function you actually hand to the element.

## Type handlers with synthetic events

React wraps native DOM events in a `SyntheticEvent`. The generic parameter is
the **element** the handler is attached to, which is what makes
`e.target.value`, `e.currentTarget`, and `preventDefault()` correctly typed.

<<< ../../examples/react/events/typed-handlers.tsx

Handy types to know:

| Event | Handler type |
| --- | --- |
| `onChange` on an `<input>` | `ChangeEvent<HTMLInputElement>` |
| `onClick` on a `<button>` | `MouseEvent<HTMLButtonElement>` |
| `onSubmit` on a `<form>` | `FormEvent<HTMLFormElement>` |
| `onKeyDown` on any element | `KeyboardEvent<HTMLElement>` |

::: tip Let inference do the work
If you write the handler **inline** (`onChange={(e) => ...}`), React already
knows the element, so `e` is typed for free - no annotation needed. You only
annotate when the handler is defined **separately** from the JSX.
:::

## Function chaining: compose small handlers

When a single `onClick` needs to do several unrelated things - analytics, local
state, *and* the consumer's own handler - don't cram them into one function.
Write single-purpose handlers and **chain** them with a tiny combinator:

<<< ../../examples/react/events/composing-handlers.tsx

`chain(track, count, onClick)` returns one handler that runs each in order for
the same event. Each concern stays independently testable, the consumer's
optional `onClick` slots in cleanly (the `?.()` guards `undefined`), and none of
them know about the others. Because `chain` is generic over the event type, the
same helper works for clicks, changes, and submits alike.

## Anti-patterns to avoid

- **Doing work in the handler that belongs in an effect - or vice versa.**
  User-triggered logic (a click, a submit) belongs in the handler. Reacting to
  *state or prop changes* belongs in an effect. See
  [When to useEffect / useCallback / useMemo](./hooks-when-to-use).
- **Recreating expensive handlers every render when the child is memoized.** If
  you pass a handler to a `memo`-wrapped child, stabilize it with `useCallback`
  (see [General Best Practices](./general-best-practices)). For plain DOM
  elements, an inline arrow is fine - don't over-optimize.

## Summary

- Type separately-defined handlers with React's **synthetic event types**;
  inline handlers are inferred for free.
- **Chain** several single-purpose handlers into one instead of writing a
  monolith.
- Put **user-triggered** logic in handlers; put **reactive** logic in effects.
