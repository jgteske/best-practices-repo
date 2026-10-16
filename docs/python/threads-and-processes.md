# Threads vs Processes

Python offers three ways to do several things at once: `asyncio`, threads and
processes. The choice depends on one question. **Is the work waiting, or
computing?** Waiting on a network, a disk or a subprocess is **I/O-bound**.
Running Python code over data is **CPU-bound**. The global interpreter lock
(GIL) is the reason the answer differs between the two.

Examples: [`examples/python/concurrency`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/concurrency).
For `asyncio`, see [Async with asyncio](./asyncio).

## The GIL in one paragraph

In standard CPython, only one thread at a time runs Python bytecode. A thread
releases the lock while it **waits**: `time.sleep`, socket reads, file I/O, and
most C extensions doing heavy work (NumPy, hashlib, compression). So threads
overlap their waiting, but not their Python computation. A **process** is a
separate interpreter with its own GIL, so processes really do run in parallel
on separate cores, at the cost of starting interpreters and copying data
between them.

## I/O-bound: threads overlap the waiting

<<< ../../examples/python/concurrency/threads_vs_processes.py#io-bound

## CPU-bound: threads don't help, processes do

<<< ../../examples/python/concurrency/threads_vs_processes.py#cpu-bound

```
  GIL enabled: True, CPUs: 16
  8 waits on 8 threads:       0.20s
  CPU work, sequential:       0.56s
  CPU work, 4 threads:        0.71s
  CPU work, 4 processes:      0.19s
```

Eight 0.2-second waits on eight threads finish in 0.2 s. Four CPU-heavy calls
on four threads are **slower** than running them one after another, because
the threads take turns on one lock and pay for every handover. Four processes
run them on four cores at once. (Timings vary by machine. The example asserts
only the I/O-bound speedup, which doesn't depend on the core count.)

### Free-threaded Python (3.13t+)

CPython 3.13 ships an optional **free-threaded** build, `python3.13t`
([PEP 703](https://peps.python.org/pep-0703/)), and 3.14 makes it officially
supported. It has no GIL, so CPU-bound threads run in parallel there.
`sys._is_gil_enabled()` reports which build you are on, as the example prints.
Free threading doesn't make shared-state bugs go away. It makes them more
likely, so the rest of this page applies with more force.

## Sharing state between threads

Threads share every object, and the GIL is **not** a lock for your code. It
protects the interpreter's internals, not your read-modify-write sequences:

<<< ../../examples/python/concurrency/threads_vs_processes.py#race

```
  without a lock: 222 of 1600
  with a lock:    1600 of 1600
```

The unsafe version reads the value, gets switched out, and then writes back a
stale result, which overwrites other threads' updates. The `time.sleep(0)`
makes the switch happen reliably here. In real code it happens rarely, which
makes the bug much harder to find. Hold a `threading.Lock` around every
read-modify-write on shared state, or don't share the state at all.

### Hand work over with `queue.Queue`

<<< ../../examples/python/concurrency/threads_vs_processes.py#queue

`queue.Queue` does all its locking internally. It is the standard way to pass
work between threads. A `maxsize` gives you backpressure: producers block when
consumers fall behind, instead of filling memory. Send one sentinel per worker
to shut them down.

## `concurrent.futures` in practice

`ThreadPoolExecutor` and `ProcessPoolExecutor` have the same interface, so you
can switch between them by changing one word.

### `submit` + `as_completed`: handle results as they arrive

<<< ../../examples/python/concurrency/executors.py#submit-and-as-completed

```
  fast: ok
  failed: medium: connection reset
  slow: ok
```

An exception raised in a worker is stored on its `Future` and **re-raised by
`result()`**. If you never call `result()`, the error is lost without a trace.

### `map`: simpler, but all-or-nothing

<<< ../../examples/python/concurrency/executors.py#map-errors

### Timeouts and shutdown

<<< ../../examples/python/concurrency/executors.py#timeouts

`result(timeout=...)` only stops *waiting*. **Python can't kill a thread.** For
work that must be stoppable, pass a `threading.Event` and check it in the loop,
or use a process, which can be terminated. `shutdown(cancel_futures=True)`
(3.9+) drops queued work instead of running it on the way out.

## Processes: the `__main__` guard and pickling

<<< ../../examples/python/concurrency/threads_vs_processes.py#main-guard

A process pool starts child interpreters (`spawn` on macOS and Windows,
`forkserver` on Linux from 3.14), and each child **imports your module** to
find the function. Code at module level runs again in every child, so the
entry point must sit under `if __name__ == "__main__":`. Functions, arguments
and results travel by pickling. That means module-level functions only (no
lambdas or closures), no unpicklable objects (open files, sockets, locks), and
a copy of every argument. Send a file path, not a gigabyte of rows.

## Choosing

| Work | Use | Why |
| --- | --- | --- |
| Many network calls, with async libraries | [`asyncio`](./asyncio) | thousands of waits on one thread, explicit `await` points |
| A few blocking calls (sync library, file I/O) | `ThreadPoolExecutor` / `asyncio.to_thread` | overlaps waits, no rewrite |
| Pure-Python number crunching | `ProcessPoolExecutor` | one GIL per core |
| NumPy / pandas / hashing / compression | threads often suffice | the C code releases the GIL |
| Lots of data, many cores, long runs | processes + shared files or `multiprocessing.shared_memory` | avoid pickling big objects |

## Rules of thumb

- Decide whether the work is waiting or computing before you pick a tool.
- Use threads for I/O and processes for pure-Python CPU work. Measure on free-threaded builds.
- The GIL doesn't protect your data. Lock read-modify-write sequences, or share nothing.
- Use `queue.Queue` with a `maxsize` to pass work between threads.
- Always call `future.result()`, or the exception is lost.
- Put process-pool entry points under `if __name__ == "__main__":`, and keep arguments small and picklable.
