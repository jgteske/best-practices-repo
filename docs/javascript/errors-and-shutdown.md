# Errors & Graceful Shutdown

Two things every long-running Node process needs and most get wrong: errors that
carry enough information to diagnose, and a shutdown path that finishes what it
started instead of dropping requests on the floor.

<<< ../../examples/javascript/node/graceful-shutdown.mjs{js}

```
errors:
  name ....... ConfigError
  instanceof . true true
  cause ...... SyntaxError: Expected property name or '}' in JSON at position 2

lifecycle:
  listening on 127.0.0.1:44585
  SIGTERM received - draining 1 in-flight request(s)
  in-flight response: done <- served despite the SIGTERM
  closed cleanly; exit code 0
```

## Throw errors, not values

`throw "something failed"` is legal and unhelpful: strings have no stack trace,
so you get a message with no idea where it came from. Always throw an `Error` (or
a subclass), and remember that a `catch` block can still receive anything - a
dependency may throw a string, and `error.message` on a string is `undefined`.

```js
catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
}
```

## Subclass, and set `name`

```js
class ConfigError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ConfigError";   // otherwise the stack trace says "Error"
    this.exitCode = 78;          // EX_CONFIG
  }
}
```

A subclass lets callers branch on **type** rather than on message text - and
message text is exactly the thing that gets reworded during a refactor, silently
breaking every `if (error.message.includes(…))` in the codebase.

Setting `name` explicitly matters because it is what appears in the stack trace;
the class name is not used automatically. Attaching structured fields
(`exitCode`, `statusCode`, `retryable`) puts the decision data on the error
instead of in a lookup table somewhere else.

::: tip A typed alternative
When the failure is expected rather than exceptional - a validation miss, a
lookup that found nothing - returning a `Result` instead of throwing makes the
failure visible in the signature and impossible to forget. See
[Error Handling](/typescript/error-handling).
:::

## Keep the cause

```js
try {
  return await loadProfile(id);
} catch (error) {
  throw new Error(`could not load profile ${id}`, { cause: error });
}
```

`cause` (ES2022) keeps the original error and its stack attached, and Node's
default handler prints the whole chain. Catching an error only to
`throw new Error("failed to load")` destroys the one piece of information that
would have told you *why*.

Rethrow what you do not recognise. `if (error.code !== "ENOENT") throw error;` is
the shape: handle the case you understand, and let everything else travel.

## The two process-level safety nets

```js
process.on("uncaughtException", (error, origin) => {
  console.error(`[fatal] uncaught ${origin}:`, error.message);
  process.exitCode = 1;
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandled rejection:", reason);
  process.exitCode = 1;
});
```

::: warning These handlers are for logging and dying, not for recovery
After an uncaught exception the process state is unknown - a half-written file, a
half-applied transaction, a connection pool in an undefined state. Continuing to
serve traffic is how a "healthy" pod starts answering requests with corrupt data.
Log with enough context to diagnose, start the shutdown, and let the process die
so the orchestrator can replace it.
:::

Since Node 15 an unhandled rejection terminates the process by default, which is
the right default. The handler exists so the failure is logged usefully first,
not so it can be swallowed.

Neither handler is a substitute for handling errors where they happen. If they
fire in normal operation, that is a bug upstream.

## Signals

| Signal | Sent by | Catchable |
| --- | --- | --- |
| `SIGTERM` | Docker, Kubernetes, systemd, `kill` | yes - **this is the one to handle** |
| `SIGINT` | Ctrl-C | yes |
| `SIGHUP` | terminal closed; conventionally "reload config" | yes |
| `SIGKILL` | `kill -9`, the orchestrator's patience running out | **no** |

`SIGKILL` cannot be caught, which is exactly why a shutdown deadline exists:
Kubernetes sends `SIGTERM`, waits `terminationGracePeriodSeconds` (30 by
default), then sends `SIGKILL` regardless. Your drain must finish inside that
window or it does not happen. More on signals in
[Processes & Jobs](/linux/processes-and-jobs).

## Draining

```js
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;        // a second Ctrl-C must not restart teardown
  shuttingDown = true;

  server.close();                  // stop accepting; let existing requests finish

  const deadline = setTimeout(() => {
    console.error("drain timed out - forcing exit");
    process.exit(1);
  }, 5_000);
  deadline.unref();                // this timer must not itself hold the loop open

  await once(server, "close");
  clearTimeout(deadline);
  // release everything else: database pools, queue consumers, open files
}
```

Four details, each of which is a real incident when missed:

1. **The `shuttingDown` guard.** Signals arrive more than once - a second Ctrl-C,
   or `SIGINT` following `SIGTERM`. Restarting teardown half-way through is worse
   than either path alone.
2. **`server.close()` stops accepting, it does not kill.** In-flight requests
   finish; the example's response is served *despite* the SIGTERM arriving
   mid-request. Idle keep-alive sockets are the usual reason `close` seems to
   hang - `server.closeIdleConnections()` handles those.
3. **The deadline.** One hung connection would otherwise keep the process alive
   until the orchestrator kills it anyway, turning a clean shutdown into a
   30-second stall on every deploy.
4. **`.unref()` on the deadline timer.** An active timer keeps the event loop
   alive; unreffing it means the process can exit as soon as the real work is
   done.

Order matters on the way out: stop accepting new work → finish in-flight work →
close outbound resources (pools, consumers, files) → exit. Closing the database
pool first means the in-flight requests you were draining fail anyway.

::: tip Fail readiness before you stop accepting
In a load-balanced deployment, flip your readiness probe to unhealthy and wait a
couple of seconds *before* calling `server.close()`. Otherwise the load balancer
is still routing to you when you stop accepting, and a handful of requests get
connection-refused during every deploy.
:::

## Exit codes

Set `process.exitCode` and let the loop drain rather than calling
`process.exit()`, which terminates immediately and can truncate a pending stdout
write. The exception is a forced exit after a deadline has expired - at that
point immediate is the point.

The conventions worth following: `0` success, `1` generic failure, `64`
`EX_USAGE` for bad arguments, `78` `EX_CONFIG` for bad configuration, `128 + n`
for death by signal. See [Running Node](./running-node#exit-codes).

## Summary

- Throw `Error` subclasses with an explicit `name`; branch on type, never on
  message text.
- Attach the original failure with `{ cause }`; rethrow anything you do not
  recognise.
- `uncaughtException`/`unhandledRejection` are for logging and dying, not for
  recovery.
- Handle `SIGTERM` - it is what every orchestrator sends. `SIGKILL` follows,
  uncatchable, on a timer.
- Guard against a second signal, stop accepting, drain, then close resources -
  in that order.
- Always set a drain deadline, and `.unref()` the timer.
- `process.exitCode` over `process.exit()`, except when forcing an exit.
