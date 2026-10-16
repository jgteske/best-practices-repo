# Performance

A React app is usually slow for one of two reasons. Either components
**re-render when nothing they show has changed**, or one update makes React
do so much work that typing and clicking start to lag. The fixes are, in order
of preference: **move state to where it is used**, **pass children in from
above**, **`memo` with stable props**, and **mark slow updates as
non-urgent**. None of them helps until you have measured.

Examples: [`examples/react/performance`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react/performance).
Every render count on this page is asserted by a Vitest test.

## Measure first

In the browser, use the React DevTools **Profiler** tab. Record an interaction,
and it shows which components rendered, how long each one took, and *why* it
rendered (enable "Record why each component rendered"). "Highlight updates
when components render" makes wasted renders visible as you click around.

In code, `<Profiler id onRender>` reports the time each commit took:

```tsx
<Profiler id="Feed" onRender={(id, phase, actualDuration) => report(id, phase, actualDuration)}>
  <Feed />
</Profiler>
```

`<Profiler>` reports on **its subtree as a whole**. It fires whenever anything
inside it commits, even when a `memo` child skipped its own render. So to count
how often one component renders, the tests here use a tiny hook instead:

<<< ../../examples/react/performance/render-counter.tsx#render-counter

A `useEffect` with no dependency array runs after every committed render of
its component, and not at all when React skips the component.

## Re-rendering isn't the problem. Wasted expensive re-renders are

When state changes, React re-renders that component **and all of its
children**, whether or not their props changed. That is by design, and for
most components it is cheap. It becomes a problem when the children are
expensive (big lists, charts, editors) and the state that changed has nothing
to do with them.

### Fix 1: move state down to where it is used

<<< ../../examples/react/performance/colocation.tsx#lifted

<<< ../../examples/react/performance/colocation.tsx#colocated

<<< ../../examples/react/performance/performance.test.tsx#test-colocation{tsx}

In `LiftedPage`, five keystrokes cause five chart renders. Moving the input's
state into its own `SearchBox` brings that to zero without any memoization,
because the chart is no longer a child of the component whose state changes.
This is the cheapest optimisation in React, and the same refactor usually
makes the code clearer. See also [State & Effects](./state-and-effects).

### Fix 2: pass the slow part as `children`

<<< ../../examples/react/performance/colocation.tsx#children-as-props

Sometimes the state really does have to wrap the slow part, as in a layout,
an animation or a scroll tracker. If the wrapper receives the slow part as
`children`, the **parent** created that element. When only the wrapper's
state changes, its `children` prop is the very same object as last time, and
React skips it.

## Fix 3: `memo` with stable props

<<< ../../examples/react/performance/memo.tsx#memo-child

`memo` makes a component skip rendering when **every** prop is `===` to its
previous value. It is a shallow comparison, and one unstable prop defeats the
whole thing:

<<< ../../examples/react/performance/memo.tsx#unstable-props

<<< ../../examples/react/performance/memo.tsx#stable-props

<<< ../../examples/react/performance/performance.test.tsx#test-memo{tsx}

::: v-pre
| Prop | New every render? | Make it stable with |
| --- | --- | --- |
| `onSelect={(id) => ...}` | yes, a new function | `useCallback` (or move it outside the component) |
| `style={{ padding: 8 }}` | yes, a new object | a module-level constant, or `useMemo` |
| `items={data.filter(...)}` | yes, a new array | `useMemo` with the inputs as deps |
| `items={items}` (from props/state) | no | nothing |
| `children={<Child />}` | yes, a new element | `memo` can't help. Prefer fix 2 |
:::

This is the main legitimate use of `useCallback` and `useMemo`. They exist to
**keep identity stable** for a `memo` child or an effect's dependency list (see
[When to use each hook](./hooks-when-to-use)). Wrapping every handler "for
performance" without a `memo` consumer only adds work.

## Fix 4: mark slow updates as non-urgent

Sometimes the render is expensive *and* necessary, like filtering a big list
as the user types. Skipping it isn't an option. What you can do is keep the
input responsive while it runs.

### `useDeferredValue`

<<< ../../examples/react/performance/transitions.tsx#deferred-value

The input renders with `query` immediately, at full priority. `<Results>`
renders with `deferredQuery`, which React updates in a background render. If
another keystroke arrives first, React abandons that render. `query !== deferredQuery`
tells you that the results are stale, so dim them instead of showing a
spinner. **`memo` on the slow child is required.** Without it, `<Results>`
re-renders on every keystroke as a child of `SearchPage`, and deferring gains
nothing.

### `useTransition`

<<< ../../examples/react/performance/transitions.tsx#transition

`startTransition` marks a state update as non-urgent. The old tab stays on
screen and keeps responding while the new one renders, and `isPending` lets
you show that something is happening. Use `useDeferredValue` when you receive
a value, and `useTransition` when you own the `set` call.

Neither one makes the slow render any faster. They let React interrupt it.
For a list of 10,000 rows, the real fix is to **render fewer rows**:
paginate, or virtualise with `@tanstack/react-virtual` or `react-window`.

## Other things that matter more than memo

- **Stable, unique `key`s.** An index or random key makes React remount rows,
  losing their state and DOM.
- **Context fan-out.** Every consumer re-renders when the context value changes.
  Split contexts by how often they change, and memoize the value object (see
  [Context](./context)).
- **Work in render.** Sorting, parsing or formatting thousands of items on every
  render belongs in `useMemo`, or better on the server.
- **Bundle size and data waterfalls** usually cost more than renders. Code-split
  with `lazy()`, and [fetch in parallel](./data-fetching).

::: tip React Compiler
The React Compiler (stable since 2025, works with React 17+) inserts the
equivalent of `memo`, `useMemo` and `useCallback` automatically at build time.
In a codebase that uses it, most of fix 3 is done for you. Fixes 1, 2 and 4
are still design decisions you have to make.
:::

## Rules of thumb

- Profile first, and fix the components that are both slow and re-rendered for no reason.
- Move state down before reaching for `memo`. Pass slow parts as `children` from above.
- `memo` works only when every prop is stable. Use `useCallback`/`useMemo` for that, not out of habit.
- Use `useDeferredValue`/`useTransition` to keep input responsive during expensive renders, together with `memo`.
- To show thousands of rows, render fewer of them.
