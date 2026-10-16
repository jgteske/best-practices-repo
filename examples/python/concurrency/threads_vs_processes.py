"""Threads vs processes: what the GIL allows, and what each one is for.

Run it: python3 threads_vs_processes.py
"""

import os
import queue
import sys
import threading
import time
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor


def fetch(n: int) -> int:
    """Stands in for a network call: it waits, and while it waits it releases the GIL."""
    time.sleep(0.2)
    return n


def crunch(n: int) -> int:
    """Pure-Python CPU work: holds the GIL the whole time."""
    total = 0
    for i in range(n):
        total += i * i % 7
    return total


def timed[T](label: str, run: Callable[[], T]) -> T:
    start = time.perf_counter()
    result = run()
    print(f"  {label:<26} {time.perf_counter() - start:5.2f}s")
    return result


# region io-bound
def io_bound() -> None:
    # Waiting releases the GIL, so threads overlap their waits: 8 x 0.2s takes ~0.2s, not 1.6s.
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch, range(8)))
    elapsed = time.perf_counter() - start
    assert results == list(range(8))  # map() keeps input order
    assert elapsed < 1.0, elapsed  # far below the 1.6s a sequential loop needs
    print(f"  8 waits on 8 threads:      {elapsed:5.2f}s")


# endregion io-bound


# region cpu-bound
def cpu_bound() -> None:
    work = [2_000_000] * 4
    sequential = timed("CPU work, sequential:", lambda: [crunch(n) for n in work])
    with ThreadPoolExecutor(max_workers=4) as pool:
        # With the GIL, only one thread runs Python bytecode at a time: no faster.
        threaded = timed("CPU work, 4 threads:", lambda: list(pool.map(crunch, work)))
    with ProcessPoolExecutor(max_workers=4) as pool:
        # Separate interpreters, separate GILs: runs on 4 cores at once.
        processed = timed("CPU work, 4 processes:", lambda: list(pool.map(crunch, work)))
    assert sequential == threaded == processed


# endregion cpu-bound


# region race
class Counter:
    def __init__(self) -> None:
        self.value = 0
        self.lock = threading.Lock()

    def unsafe_increment(self) -> None:
        current = self.value  # read...
        time.sleep(0)  # ...any point here may switch to another thread...
        self.value = current + 1  # ...and this write overwrites theirs

    def safe_increment(self) -> None:
        with self.lock:  # read-modify-write as one step
            current = self.value
            time.sleep(0)
            self.value = current + 1


def hammer(increment: Callable[[], None], threads: int = 8, calls: int = 200) -> None:
    """Call `increment` from many threads at once and wait for all of them."""

    def run() -> None:
        for _ in range(calls):
            increment()

    workers = [threading.Thread(target=run) for _ in range(threads)]
    for thread in workers:
        thread.start()
    for thread in workers:
        thread.join()


def race() -> None:
    unsafe, safe = Counter(), Counter()
    hammer(unsafe.unsafe_increment)
    hammer(safe.safe_increment)
    print(f"  without a lock: {unsafe.value} of 1600")
    print(f"  with a lock:    {safe.value} of 1600")
    assert unsafe.value < 1600  # updates were lost
    assert safe.value == 1600


# endregion race


# region queue
def pipeline() -> None:
    # queue.Queue is thread-safe: the standard way to hand work between threads.
    tasks: queue.Queue[int | None] = queue.Queue(maxsize=10)  # bounded: producers wait when full
    results: queue.Queue[int] = queue.Queue()

    def worker() -> None:
        while (item := tasks.get()) is not None:  # None is the "no more work" sentinel
            results.put(item * item)

    workers = [threading.Thread(target=worker) for _ in range(3)]
    for thread in workers:
        thread.start()
    for n in range(20):
        tasks.put(n)
    for _ in workers:
        tasks.put(None)  # one sentinel per worker
    for thread in workers:
        thread.join()
    assert sorted(results.get() for _ in range(20)) == [n * n for n in range(20)]


# endregion queue


# region main-guard
# ProcessPoolExecutor starts fresh interpreters that IMPORT this module to find `crunch`.
# Without this guard, each child would run the demo again (and spawn children of its own).
# Functions, arguments and results cross the process boundary by pickling: no lambdas,
# no open sockets, and big arguments cost a copy each way.
if __name__ == "__main__":
    gil = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True
    print(f"  GIL enabled: {gil}, CPUs: {os.cpu_count()}")
    io_bound()
    cpu_bound()
    race()
    pipeline()
# endregion main-guard
