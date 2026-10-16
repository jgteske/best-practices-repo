"""concurrent.futures in practice: submit vs map, errors, timeouts, and shutting down.

Run it: python3 executors.py
"""

import time
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FutureTimeout


def download(name: str) -> str:
    delay = {"fast": 0.01, "medium": 0.1, "slow": 0.2}[name]
    time.sleep(delay)
    if name == "medium":
        raise ConnectionError(f"{name}: connection reset")
    return f"{name}: ok"


# region submit-and-as-completed
# submit() returns a Future per call; as_completed() yields each one as soon as it finishes,
# so fast results are handled without waiting for slow ones.
with ThreadPoolExecutor(max_workers=3) as pool:
    futures: dict[Future[str], str] = {
        pool.submit(download, name): name for name in ("slow", "medium", "fast")
    }
    done_order: list[str] = []
    for future in as_completed(futures):
        name = futures[future]
        done_order.append(name)
        try:
            print(f"  {future.result()}")
        except ConnectionError as error:  # the worker's exception is re-raised by result()
            print(f"  failed: {error}")
assert done_order == ["fast", "medium", "slow"]
# endregion submit-and-as-completed


# region map-errors
# map() is simpler but all-or-nothing: results come back in input order,
# and the first exception is raised when iteration reaches it.
with ThreadPoolExecutor(max_workers=3) as pool:
    results = pool.map(download, ["fast", "medium", "slow"])
    assert next(results) == "fast: ok"
    try:
        next(results)
    except ConnectionError:
        pass
    else:
        raise AssertionError("expected the 'medium' error")
# endregion map-errors


# region timeouts
# result(timeout=) stops *waiting* - it cannot stop the thread. Python threads cannot be
# killed; long-running work has to check a flag or an Event and return on its own.
with ThreadPoolExecutor(max_workers=1) as pool:
    slow = pool.submit(time.sleep, 0.3)
    try:
        slow.result(timeout=0.05)
    except FutureTimeout:  # an alias of the built-in TimeoutError since 3.11
        print("  gave up waiting after 0.05s (the sleep keeps running)")
    queued = pool.submit(time.sleep, 10)  # still waiting for the single worker
    # On the way out, cancel everything that has not started yet instead of running it.
    pool.shutdown(wait=True, cancel_futures=True)
assert queued.cancelled()
# endregion timeouts
