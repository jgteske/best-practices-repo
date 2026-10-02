# State with Reducers

`useState` is right for independent values. When several values change
**together**, follow **rules** ("a cart can't be edited after ordering"), or
are changed from many handlers, those rules end up scattered across event
handlers. `useReducer` gathers them into one pure function:
`(state, action) => newState`.

Examples: [`examples/react/reducers`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react/reducers).

## A reducer with typed actions

<<< ../../examples/react/reducers/cart-reducer.tsx

- **Actions are a discriminated union**, named as **events** in the past tense
  (`added`, `checkoutStarted`). Handlers report what happened. The reducer
  decides what that means. That keeps business rules out of `onClick`.
- **The `never` default** makes adding an action type without handling it a
  compile error. See [Exhaustive Checks](/typescript/exhaustive-checks-with-never).
- **Rules live in one place.** "Quantity 0 removes the line", "empty carts
  can't check out" and "ordered carts are frozen" are each one `if` in the
  reducer, not a condition repeated in every button.
- **Return the same object for no-ops.** When nothing changes, `return state`
  lets React skip the re-render.
- **Derived values** (`cartTotal`) are computed from state, never stored in
  it. See [Derive, don't duplicate](./state-and-effects#derive-don-t-duplicate).

## `useState` or `useReducer`?

| Use `useState` when... | Use `useReducer` when... |
| --- | --- |
| values are independent (`isOpen`, `query`) | several fields change together |
| updates are simple assignments | an update depends on rules or on the current state |
| one or two handlers change it | many handlers, or deep children, send changes |
| | you want to unit-test the logic without rendering |

Neither is "more advanced". A reducer is useful when the *transitions* deserve a
name and a test. The [discriminated-union state machines](/typescript/modeling-with-unions#state-machines-fall-out-naturally)
on the TypeScript side are reducers without React.

## Reducer + context: shared state without prop drilling

<<< ../../examples/react/reducers/reducer-context.tsx

State and `dispatch` go into **separate contexts**. `dispatch` has a stable
identity for the life of the component, so `AddToCartButton`, which only sends
actions, never re-renders when the cart changes. Only `CartBadge`, which reads
state, does. The guard hooks (`useCart`, `useCartDispatch`) turn a missing
provider into a clear error and give callers non-null types. The
[Context page](./context) covers the pattern in general.

## Testing a reducer

A reducer is a plain function, so testing it needs no rendering. Replay a list
of actions with `Array.prototype.reduce` and check the result:

<<< ../../examples/react/reducers/cart-reducer.test.tsx

The same file also tests the components through the UI. See
[Testing Components](./testing-components) for the tools.

## Summary

- Use `useReducer` when updates follow rules, change several fields together, or come from many places.
- Write actions as a discriminated union of past-tense events, and use a `never` default.
- Keep the reducer pure: no fetches, no randomness, no mutation. Return `state` unchanged for no-ops.
- Put state and `dispatch` in separate contexts so senders don't re-render.
