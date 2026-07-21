# State & Effects

Most React bugs trace back to one of two mistakes: **storing state that should
have been derived**, or **writing an effect that reads a value it forgot to
declare**. Get these two right and components become far easier to reason about.

## Derive, don't duplicate

If a value can be computed from existing state or props, compute it during
render. Duplicated state drifts out of sync; derived values never can.

<<< ../../examples/react/state-effects/derived-state.tsx

The only real state here is `query`. The filtered list and the total are
**derived** every render. `useMemo` wraps the filtering because it runs on every
keystroke; the `total` is a cheap `reduce`, so it needs no memo. Storing either
in its own `useState` would introduce a second source of truth that you'd have
to keep manually in sync - the classic "two states, one truth" bug.

## Write effects with honest dependencies

An effect must list **every reactive value it reads**, and - if it starts async
work - guard against a stale response overwriting a newer one.

<<< ../../examples/react/state-effects/effect-dependencies.tsx

The `ignore` flag is the important part. When `userId` changes from `"a"` to
`"b"`, React runs the previous effect's cleanup (setting *that* run's `ignore`
to `true`) before starting the new one. So if request `"a"` resolves *after*
`"b"`, its `setUser` is skipped - no race, no flicker of the wrong user.

::: warning Never lie to the dependency array
Silencing `exhaustive-deps` by omitting a dependency doesn't remove the bug - it
hides it. The effect keeps reading a stale closed-over value. If a dependency
changes "too often," fix the *cause* (memoize it, move it into the effect, or
use a functional state update), don't delete it from the array.
:::

## Cancel with AbortController

The `ignore` flag above prevents the race, but the stale request still runs to
completion - it downloads a response nobody will read. Pass the effect's
`AbortSignal` to `fetch` instead and the cleanup truly **cancels** the request.

<<< ../../examples/react/state-effects/abortable-effect.tsx

Cleanup creates one `AbortController` per effect run and calls `abort()` when
`userId` changes or the component unmounts. A cancelled `fetch` rejects with an
`"AbortError"`, which is *expected* here - so the `.catch` swallows it and only
real failures reach the error state. This is the same signal-threading pattern
covered end to end in
[Cancellation & AbortSignal](../typescript/cancellation-and-signals) on the
TypeScript side.

## Summary

- **Derive** values during render instead of storing them in extra state.
- Reach for **`useMemo`** only when a derivation is genuinely expensive.
- List **every reactive value** an effect reads in its dependency array.
- Guard async effects with a **cleanup flag** or, better,
  [`AbortController`](#cancel-with-abortcontroller) - which cancels the stale
  request instead of just ignoring its response.
- See [When to useEffect / useCallback / useMemo](./hooks-when-to-use) for
  choosing the right hook in the first place.
