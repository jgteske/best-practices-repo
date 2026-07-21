# Cancellation & AbortSignal

Async work that can't be cancelled is a resource leak waiting to happen: a
component unmounts but its `fetch` keeps downloading, a user types a new query
while three stale ones are still in flight, a request hangs with no deadline.
The web platform's answer to all of these is one small pair of types -
`AbortController` and `AbortSignal` - and once you thread a signal through your
async APIs, cancellation composes for free.

## Accept a signal, don't invent one

The single most useful habit: any async function that does I/O should take an
optional `AbortSignal` and pass it straight down to whatever it calls. The
caller creates and owns the controller; your function just cooperates.

<<< ../../examples/typescript/cancellation/abortable-fetch.ts

Two things worth internalising here:

- **A cancelled `fetch` rejects.** It throws a `DOMException` named
  `"AbortError"`. That's not a failure - it's you getting exactly what you
  asked for - so it belongs in its own branch, never in your error logging or a
  user-facing "something went wrong".
- **`isAbortError` is a type guard.** Narrowing to `DOMException` (rather than
  returning a bare `boolean`) is the same discipline as everywhere else in this
  guide: let the compiler track what you've proven.

::: warning exactOptionalPropertyTypes and `signal`
`RequestInit.signal` is typed `AbortSignal | null` - it does **not** include
`undefined`. With [`exactOptionalPropertyTypes`](./general-best-practices)
on, `fetch(url, { signal: undefined })` is a type error. Pass the whole init
conditionally (`signal ? { signal } : undefined`), as the example does, rather
than handing `fetch` an explicit `undefined`.
:::

## Let the platform build signals for you

You rarely need to wire up a `setTimeout` and an `AbortController` by hand. Two
static factories cover most cases, and they **compose**:

<<< ../../examples/typescript/cancellation/signal-factories.ts

- `AbortSignal.timeout(ms)` is a self-aborting signal - no controller to hold,
  nothing to clear. It aborts with a **`"TimeoutError"`**, which is how you tell
  a blown deadline apart from a user cancel (handy when you retry the former but
  not the latter - that's what `describeAbort` is for).
- `AbortSignal.any([...])` merges signals: the result aborts the instant *any*
  input does. Combining the caller's signal with your own timeout means a single
  `signal` honours both without nested `try`/`catch` or flags.

| Source | Aborts when | `name` of the error/reason |
| --- | --- | --- |
| `controller.abort()` | you call it | `"AbortError"` |
| `AbortSignal.timeout(ms)` | the deadline passes | `"TimeoutError"` |
| `AbortSignal.any([a, b])` | `a` **or** `b` aborts | inherited from whichever fired |

## Cancel the previous request, and your own loops

For "search as you type" and similar cancel-the-last-one flows, hold a
controller and abort it before starting the next request. And when the
long-running work is code *you* wrote (not a `fetch` that checks the signal for
you), poll the signal at safe points with `throwIfAborted()`.

<<< ../../examples/typescript/cancellation/cancel-previous.ts

Aborting the previous request is a stronger fix than an `ignore` flag: the flag
only *discards* the late response, while `abort()` actually stops the download
and frees the connection. `throwIfAborted()` throws the signal's `reason` - the
same `DOMException` `fetch` would throw - so callers handle cancellation
identically no matter where in the stack it originated.

## Summary

- Give every I/O function an optional `AbortSignal` param and pass it down;
  the caller owns cancellation.
- Treat `"AbortError"` as **expected**, in its own branch - never as a failure.
- Reach for `AbortSignal.timeout()` and `AbortSignal.any()` before hand-rolling
  timers; they compose a caller's cancel with your deadline into one signal.
- Abort the previous request to kill "search as you type" races; use
  `throwIfAborted()` to make your own loops cancellable.
- In React, the same signal cancels a `fetch` from an effect's cleanup - see
  [State & Effects](../react/state-and-effects#cancel-with-abortcontroller).
