"""Coroutines, tasks, gather and async iteration.

Run it: python3 asyncio_basics.py
"""

import asyncio
import itertools
import time
from collections.abc import AsyncIterator


# region coroutines-vs-tasks
async def fetch(name: str, delay: float) -> str:
    await asyncio.sleep(delay)  # stands in for a network call
    return f"{name} done"


async def sequential() -> list[str]:
    # Each `await` waits for the previous call to finish: 0.1 + 0.1 + 0.1 seconds.
    return [await fetch("a", 0.1), await fetch("b", 0.1), await fetch("c", 0.1)]


async def concurrent() -> list[str]:
    # create_task() schedules the coroutine right away; awaiting collects the result.
    # All three sleep at the same time: about 0.1 seconds in total.
    tasks = [asyncio.create_task(fetch(name, 0.1)) for name in "abc"]
    return [await task for task in tasks]


async def compare() -> None:
    coroutine = fetch("x", 0)
    # Calling an async function runs nothing - it only builds a coroutine object.
    assert asyncio.iscoroutine(coroutine)
    assert await coroutine == "x done"

    start = time.perf_counter()
    assert await sequential() == ["a done", "b done", "c done"]
    sequential_time = time.perf_counter() - start

    start = time.perf_counter()
    assert await concurrent() == ["a done", "b done", "c done"]
    concurrent_time = time.perf_counter() - start

    assert concurrent_time < sequential_time / 2
    print(f"  sequential ~{sequential_time:.1f}s, concurrent ~{concurrent_time:.1f}s")


asyncio.run(compare())
# endregion coroutines-vs-tasks


# region gather
async def flaky(n: int) -> int:
    await asyncio.sleep(0.01 * (3 - n))  # finish in reverse order...
    if n == 2:
        raise ValueError(f"item {n} failed")
    return n * 10


async def gather_demo() -> None:
    # ...but gather() returns results in the order the awaitables were passed.
    assert list(await asyncio.gather(flaky(0), flaky(1))) == [0, 10]

    # By default the first exception propagates, and the other awaitables keep running.
    # return_exceptions=True puts exceptions in the result list instead.
    results = await asyncio.gather(flaky(0), flaky(1), flaky(2), return_exceptions=True)
    print(f"  {results!r}")
    assert isinstance(results[2], ValueError)


asyncio.run(gather_demo())
# endregion gather


# region async-iteration
async def ticker(count: int) -> AsyncIterator[int]:
    # An async generator: `yield` inside `async def`. Consumers use `async for`.
    for n in range(count):
        await asyncio.sleep(0)  # give other tasks a turn between items
        yield n


async def iteration_demo() -> None:
    seen = [n async for n in ticker(5) if n % 2 == 0]
    assert seen == [0, 2, 4]


asyncio.run(iteration_demo())
# endregion async-iteration


# region blocking-call
async def heartbeat(beats: list[float]) -> None:
    for _ in range(5):
        beats.append(time.perf_counter())
        await asyncio.sleep(0.02)


async def blocking_demo() -> None:
    beats: list[float] = []
    beat_task = asyncio.create_task(heartbeat(beats))
    await asyncio.sleep(0)  # let the heartbeat record its first beat
    time.sleep(0.1)  # WRONG inside async code: blocks the event loop and every task on it
    await beat_task
    gaps = [later - earlier for earlier, later in itertools.pairwise(beats)]
    print(f"  longest gap between heartbeats: {max(gaps):.2f}s (expected 0.02s)")
    assert max(gaps) >= 0.1


asyncio.run(blocking_demo())
# endregion blocking-call
