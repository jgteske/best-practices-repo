# Error Boundaries & Error Handling

React has two separate error paths, and most error-handling bugs come from
mixing them up:

- An error thrown **while a component renders** is caught by the nearest
  **error boundary**, which swaps that subtree for a fallback UI.
- An error thrown **anywhere else** (event handlers, effects that run async
  work, timers, promises) never reaches a boundary. You handle it with
  `try`/`catch`, or you pass it to a boundary on purpose.

| Where the error is thrown | Caught by a boundary? | Handle it with |
| --- | --- | --- |
| Rendering, including `useMemo` and lazy `useState` initializers | Yes | An `ErrorBoundary` around the subtree |
| Lifecycle methods and the synchronous body of `useEffect` / `useLayoutEffect` | Yes | An `ErrorBoundary` |
| Event handlers (`onClick`, `onSubmit`, ...) | **No** | `try`/`catch`, then UI state or [`useShowBoundary`](#errors-outside-render-reach-a-boundary-on-purpose) |
| Async code: `await`, `.then`, `setTimeout`, subscriptions | **No** | `try`/`catch` or [`tryCatch`](#catch-functions), then the same options |
| Server-side rendering | **No** | Your server framework's error handling |
| Inside the boundary's own fallback | **No**, it goes to the next boundary up | Keep fallbacks simple |

## Catch functions

JavaScript can throw anything: a string, `undefined`, a plain object. Strict
mode types every `catch` binding as `unknown`. A few small helpers turn that
`unknown` into something the rest of the code can rely on:

<<< ../../examples/react/error-handling/errors.ts

- **`toError`** normalizes any thrown value to an `Error`. It keeps the
  original value as `cause`, so nothing is lost.
- **`HttpError`** is a separate class for *expected* failures, so callers can
  tell them apart from bugs with `instanceof`.
- **`tryCatch`** turns a promise that might reject into a `Result` that never
  rejects. The compiler then won't let you read `value` before checking `ok`.
  This is the same idea as the [`Result` type](../typescript/error-handling) in
  the TypeScript guide.
- **`fetchJson`** throws on a non-2xx response. Plain `fetch` *resolves* on a
  404 or 500, which is a common source of silently ignored failures.
- **`logError`** is the one place errors go to monitoring, so swapping in
  Sentry or similar later is a one-line change.

## A typed error boundary

Hooks still can't catch render errors. That needs `getDerivedStateFromError`,
which only exists on class components. So write **one** well-typed boundary
class and use it everywhere like any other component:

<<< ../../examples/react/error-handling/error-boundary.tsx

The two catch methods have separate jobs:

- **`getDerivedStateFromError`** runs during render. It must be pure. It only
  returns the state that switches to the fallback.
- **`componentDidCatch`** runs after commit. Side effects such as reporting
  belong here. `info.componentStack` tells you which component threw.

`fallback` is a **render function** rather than a fixed element. That way the
fallback can show the error and offer a "Try again" button wired to `reset`.
`resetKeys` clears the error automatically when something the subtree depends
on changes, such as the route or the selected item's id.

::: tip Or use the library
[`react-error-boundary`](https://github.com/bvaughn/react-error-boundary)
ships this same API (`fallbackRender`, `onError`, `onReset`, `resetKeys`, and a
`useErrorBoundary` hook) and is maintained. The class above is useful for
understanding how it works, or when you don't want the dependency.
:::

## Expected errors are state, unexpected errors go to a boundary

Before writing a `catch`, decide which kind of failure it is:

- **Expected** failures are part of normal use: invalid input, a 404, a
  conflict. Store them in state and show them **next to what failed**, so the
  user can fix the problem and continue.
- **Unexpected** failures are bugs, 500s, or the network going down. The
  component can't recover from these. Pass them to the nearest boundary.

### In an event handler

Event handlers run outside render, so a boundary never sees errors thrown in
them. Use `try`/`catch`:

<<< ../../examples/react/error-handling/handling-errors.tsx#event-handler{tsx}

The `finally` block matters. It resets `saving` on success, on the early
`return`, and on escalation, so the button can't get stuck in the disabled
state.

### In an effect

<<< ../../examples/react/error-handling/handling-errors.tsx#effect{tsx}

`tryCatch` lets the async function read top to bottom: success, then our own
cancellation, then the expected 404, then everything else. The abort check
comes first because cleanup cancelling a request is not a failure. See
[State & Effects](./state-and-effects#cancel-with-abortcontroller) for more on
cancellation.

### Fire-and-forget work

<<< ../../examples/react/error-handling/handling-errors.tsx#fire-and-forget{tsx}

Analytics, prefetching, and similar background work should never take the page
down. Catch the error and report it. Never use an empty `.catch(() => {})`.

## Errors outside render: reach a boundary on purpose

To send an event-handler or async error to a boundary, hand it back to React
as a state update whose updater throws. React runs updaters during the next
render, so the throw happens *inside* render and the nearest boundary catches
it:

<<< ../../examples/react/error-handling/use-show-boundary.tsx

The returned function has a stable identity, so you can safely list it in
effect dependencies. That's how `OrderList` above uses it.

::: warning Don't rethrow from a handler and hope
`throw` inside `onClick` or a `.then` does **not** show the fallback. The
error goes to `window.onerror` or becomes an unhandled rejection, and the UI
stays in whatever half-updated state it was in. Either handle the error, or
call `showBoundary(error)`.
:::

## Where to put boundaries

A boundary replaces **everything** below it with its fallback. Where you place
it decides how much of the page a single bug takes down, so nest several, from
coarse to fine:

<<< ../../examples/react/error-handling/boundary-placement.tsx

1. **Root**: the last line of defence. Without any boundary, an uncaught
   render error unmounts the whole tree and leaves a blank page.
2. **Route**: keeps navigation working when one page breaks.
   `resetKeys={[path]}` clears the error when the user navigates away.
3. **Widget**: independent panels each get their own boundary. In the example,
   a failing `OrderList` shows its fallback while `ProfileForm` and the nav keep
   working.

There are two ways to retry:

- **`reset()`** (or `resetKeys`) re-renders the children and **keeps their
  state**. Use it when the failure was transient, like a network blip.
- **Changing `key`** (`RetryFromScratch`) remounts the subtree and **drops all
  its state**. Use it when the state itself might be what's broken.

::: info React 19
In React 19, `createRoot` and `hydrateRoot` accept `onCaughtError`,
`onUncaughtError` and `onRecoverableError` options. Use them as a single global
place to report errors. Boundaries still decide **what the user sees**. In
development, React logs caught errors to the console even when a boundary
handled them, which is expected.
:::

## Summary

- Error boundaries catch errors thrown **during render**. They don't catch
  errors from event handlers, async code, or SSR.
- Normalize every caught value with **`toError`**, and model expected async
  failures as a **`Result`** with `tryCatch`.
- Show **expected** errors as state next to what failed. Send **unexpected**
  ones to a boundary with **`useShowBoundary`**.
- Keep `getDerivedStateFromError` pure, and report errors from
  **`componentDidCatch`** (`onError`).
- Nest boundaries **root → route → widget**. Reset with `resetKeys`, or with
  `key` when you need fresh state.
- Use `finally` to undo pending UI state, and never swallow an error
  silently.

The examples on this page were also exercised under jsdom with React 18 to
confirm the behavior described: boundaries catching and resetting, handler
errors bypassing them, `useShowBoundary` escalating, the 404/409/500 branches,
abort-on-unmount, and widget isolation.
