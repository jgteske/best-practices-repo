# When to useEffect / useCallback / useMemo

The built-in hooks look interchangeable to newcomers, and reaching for the wrong
one is the source of a huge share of React bugs and needless complexity. This
page is a decision guide: **what each hook is actually for, and - just as
important - when *not* to use it.**

## Quick decision table

<div class="vp-doc">

| I want to... | Use | Not |
| --- | --- | --- |
| Remember a value that changes and should re-render the UI | `useState` | a module variable, a ref |
| Synchronize with an **external** system (network, DOM, subscription, timer) | `useEffect` | doing it during render |
| Transform props/state for rendering | *plain calculation in render* | `useEffect` + `useState` |
| Respond to a **user event** | *an event handler* | `useEffect` watching state |
| Keep a **mutable value** that must **not** trigger re-render | `useRef` | `useState` |
| Cache an **expensive calculation** between renders | `useMemo` | recomputing unconditionally when it's actually cheap |
| Keep a **function's identity stable** across renders | `useCallback` | wrapping every function reflexively |

</div>

## useEffect: for external systems only

An Effect's job is to **synchronize your component with something outside
React** - a server, the document title, a `setInterval`, a WebSocket. If your
Effect only reads and writes your own state/props, it almost certainly
shouldn't be an Effect.

<<< ../../examples/react/state-effects/you-might-not-need-effect.tsx

Two anti-patterns this replaces:

- **Transforming data in an Effect** and mirroring it into state. Just compute
  it during render - see [State & Effects](./state-and-effects).
- **Reacting to a user event in an Effect** that watches state. Do the work in
  the handler, where the actual cause (the click) lives.

::: tip The one-question test
"Would this code need to run even if no user interacted and no state changed -
purely to keep in step with the outside world?" If **no**, it's not an Effect.
:::

## useCallback: stabilize identity that something depends on

`useCallback(fn, deps)` returns the *same function instance* between renders
until a dependency changes. That only matters when **something downstream
compares by identity**:

- the function is passed to a **`memo`**-wrapped child (a new function every
  render would defeat the memo);
- the function is a **dependency of another hook** (`useEffect`, `useMemo`, or
  another `useCallback`).

```tsx
// ✅ Worth it: handler passed to a memoized child (see general-best-practices).
const handleSelect = useCallback((id: string) => setSelected(id), []);

// ❌ Pointless: nothing compares this by identity; the wrapper is pure overhead.
const handleClick = useCallback(() => setOpen(true), []);
// vs. just:  const handleClick = () => setOpen(true);
```

If nothing depends on the function's identity, `useCallback` adds cost and noise
for zero benefit.

## useMemo: cache expensive work, or stabilize an object's identity

`useMemo(fn, deps)` caches a **value**. Use it when either:

- the calculation is genuinely expensive (filtering/sorting large lists,
  parsing) and runs often - as in the filtering on
  [State & Effects](./state-and-effects); **or**
- you need a **stable object/array reference** to pass to a `memo` child or a
  dependency array (the value-level twin of `useCallback`).

Don't memoize trivial arithmetic or string work - the comparison of `deps` can
cost more than just recomputing.

## useRef: mutable state that doesn't render

`useRef` holds a mutable `.current` that **survives re-renders but never
triggers one**. Use it for imperative handles (a DOM node), or to remember a
value across renders that the UI doesn't display - a previous value, a timer id,
a "has mounted" flag.

## Summary

- **`useEffect`** synchronizes with **external systems** - not with your own
  state or user events.
- **`useCallback`/`useMemo`** exist to **stabilize identity or cache expensive
  work**; using them when nothing depends on that is pure overhead.
- **`useRef`** is mutable, non-rendering storage.
- When in doubt, prefer a **plain calculation** or an **event handler** over a
  hook.
