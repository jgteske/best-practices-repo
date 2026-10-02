# Async with asyncio

`asyncio` runs many I/O-bound operations concurrently on **one thread**. Think of
network calls, database queries and subprocesses. A coroutine runs until it reaches an
`await` on something that isn't ready yet. It then hands control back to the
**event loop**, which resumes whichever coroutine can make progress next.

If you know JavaScript, the model is the same as
[the Node event loop](/javascript/event-loop-and-async). The main difference: in
Python nothing runs until you start a loop with `asyncio.run()`, and a
coroutine only runs when it is awaited or wrapped in a task.

Examples: [`examples/python/concurrency`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/concurrency).

::: tip When asyncio is the right tool
asyncio pays off when a program spends most of its time **waiting**, for example on HTTP
calls, sockets, or a database driver that has an async API. CPU-heavy work does not get
faster on one thread. For that, use `concurrent.futures.ProcessPoolExecutor`. And for a
handful of blocking calls in an otherwise synchronous script, a `ThreadPoolExecutor` is simpler.
:::

## Coroutines vs tasks

<<< ../../examples/python/concurrency/asyncio_basics.py#coroutines-vs-tasks

```
  sequential ~0.3s, concurrent ~0.1s
```

- `async def` defines a **coroutine function**. Calling it runs *nothing*; it
  returns a coroutine object.
- `await coroutine` runs it to completion *before* the next line. Three
  awaits in a row are sequential, just slower to write than synchronous code.
- `asyncio.create_task(coroutine)` schedules it to run **now**, alongside
  everything else. Awaiting the task later collects its result.
- `asyncio.run(main())` creates the loop, runs `main` and closes the loop. Call it
  once, at the program's entry point. Don't nest it.

## `gather`: run several and collect the results

<<< ../../examples/python/concurrency/asyncio_basics.py#gather

```
  [0, 10, ValueError('item 2 failed')]
```

`gather` returns the results **in argument order**, whatever order the tasks finished in.
Its failure behaviour is the catch: when one awaitable raises, `gather` raises
that error but does **not** cancel the others. They keep running unobserved.
For new code, prefer a `TaskGroup`.

## Structured concurrency with `TaskGroup` (3.11+)

<<< ../../examples/python/concurrency/task_groups.py#task-group

`async with asyncio.TaskGroup()` is the default way to run tasks side by side.
The block cannot exit until every task started in it has finished, so a task can
never be forgotten or leaked past the function that started it.

### When a task fails

<<< ../../examples/python/concurrency/task_groups.py#task-group-failure

```
  failed: ['orders unreachable']
```

When one task fails, the group **cancels all the others**, waits for them, and
raises every failure together in an `ExceptionGroup`. That happens even when
only one task failed, so callers catch it with `except*`
(see [exception groups](./errors-and-context-managers#notes-and-exception-groups-3-11)).

## Cancellation

<<< ../../examples/python/concurrency/task_groups.py#cancellation

`task.cancel()` doesn't stop a task immediately. It raises `CancelledError`
**at the task's next `await`**, so `finally` blocks and `async with` exits
still run. Two rules:

- **Re-raise `CancelledError`** if you catch it. Swallowing it makes the task
  ignore cancellation, which breaks timeouts and `TaskGroup` shutdown.
- Put cleanup in `finally` (or a context manager), never only in the happy path.

## Timeouts

<<< ../../examples/python/concurrency/limits_and_timeouts.py#timeout

```
  query timed out after 0.05s
```

`asyncio.timeout()` (3.11+) puts one deadline around a whole block, however
many awaits it contains. When the deadline passes, the block's current await is
cancelled and `TimeoutError` (the built-in one) is raised. `wait_for` does the
same for a single awaitable. **Every network call needs a timeout**, because the
default is to wait forever.

## Limit concurrency with a `Semaphore`

<<< ../../examples/python/concurrency/limits_and_timeouts.py#semaphore

```
  10 downloads, never more than 3 at once
```

Starting 10 000 tasks against one API is easy, and so is getting rate-limited.
A `Semaphore(n)` lets at most `n` coroutines into its `async with` block at
once. The others wait at the door. This is the asyncio version of the
[promise queue](/javascript/promise-queues) on the JavaScript side.

## Worker pools with `Queue`

<<< ../../examples/python/concurrency/limits_and_timeouts.py#queue

A bounded `asyncio.Queue` gives you **backpressure**: `put()` waits while the
queue is full, so a fast producer can't run ahead of slow workers and fill
memory. `Queue.shutdown()` (3.13+) is the clean way to stop. Workers drain the
items that are left and then get `QueueShutDown` from `get()`. Before 3.13 the
usual workaround was a sentinel value or cancelling the workers.

## Never block the event loop

<<< ../../examples/python/concurrency/asyncio_basics.py#blocking-call

```
  longest gap between heartbeats: 0.10s (expected 0.02s)
```

The loop is one thread. A synchronous call such as `time.sleep`, `requests.get`,
a big file read or heavy computation freezes **every** task until it returns.
Run unavoidable blocking calls in a thread:

<<< ../../examples/python/concurrency/limits_and_timeouts.py#to-thread

`asyncio.to_thread(func, *args)` runs `func` in the default thread pool and
gives you an awaitable for the result. Run with `PYTHONASYNCIODEBUG=1` (or
`asyncio.run(main(), debug=True)`) and asyncio logs every callback that held
the loop for more than 100 ms.

## Async iteration

<<< ../../examples/python/concurrency/asyncio_basics.py#async-iteration

An `async def` that contains `yield` is an **async generator**. You consume it with
`async for` or an async comprehension. It's the natural shape for paginated
APIs and streams. The [synchronous generators page](./iterators-and-generators)
covers the same ideas without `await`.

## Summary

- Start the loop once with `asyncio.run(main())`. Calling a coroutine function only creates a coroutine.
- Run things concurrently with **`TaskGroup`**. It cancels siblings on failure and never leaks tasks.
- Put a **timeout** on every external call, and a **`Semaphore`** or bounded `Queue` on fan-out.
- Never call blocking code on the loop. Use `asyncio.to_thread` or an async library.
- Re-raise `CancelledError`, and do cleanup in `finally`.
