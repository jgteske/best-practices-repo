"""Timeouts, concurrency limits, worker queues, and running blocking code.

Run it: python3 limits_and_timeouts.py
"""

import asyncio
import hashlib
import time


# region timeout
async def slow_query() -> str:
    await asyncio.sleep(1.0)
    return "rows"


async def timeout_demo() -> None:
    try:
        async with asyncio.timeout(0.05):  # everything inside shares one deadline
            await slow_query()
    except TimeoutError:
        print("  query timed out after 0.05s")
    else:
        raise AssertionError("expected a timeout")

    # A fallback value instead of an error:
    try:
        result = await asyncio.wait_for(slow_query(), timeout=0.05)
    except TimeoutError:
        result = "cached rows"
    assert result == "cached rows"


asyncio.run(timeout_demo())
# endregion timeout


# region semaphore
async def download(url: str, limit: asyncio.Semaphore, stats: dict[str, int]) -> str:
    async with limit:  # at most N coroutines get past this line at once
        stats["running"] += 1
        stats["peak"] = max(stats["peak"], stats["running"])
        await asyncio.sleep(0.01)
        stats["running"] -= 1
    return url


async def semaphore_demo() -> None:
    limit = asyncio.Semaphore(3)
    stats = {"running": 0, "peak": 0}
    urls = [f"https://example.com/{n}" for n in range(10)]
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(download(url, limit, stats)) for url in urls]
    assert [task.result() for task in tasks] == urls
    assert stats["peak"] == 3
    print(f"  10 downloads, never more than {stats['peak']} at once")


asyncio.run(semaphore_demo())
# endregion semaphore


# region queue
async def producer(queue: asyncio.Queue[int]) -> None:
    for job in range(6):
        await queue.put(job)  # waits while the queue is full: backpressure
    queue.shutdown()  # 3.13+: workers drain what is left, then get QueueShutDown


async def consumer(name: str, queue: asyncio.Queue[int], done: list[tuple[str, int]]) -> None:
    while True:
        try:
            job = await queue.get()
        except asyncio.QueueShutDown:
            return
        await asyncio.sleep(0.01)
        done.append((name, job))


async def queue_demo() -> None:
    queue: asyncio.Queue[int] = asyncio.Queue(maxsize=2)
    done: list[tuple[str, int]] = []
    async with asyncio.TaskGroup() as group:
        group.create_task(producer(queue))
        for name in ("w1", "w2"):
            group.create_task(consumer(name, queue, done))
    assert sorted(job for _, job in done) == list(range(6))
    assert {name for name, _ in done} == {"w1", "w2"}  # the work was shared


asyncio.run(queue_demo())
# endregion queue


# region to-thread
def hash_file_contents(data: bytes) -> str:
    time.sleep(0.1)  # a blocking call: file I/O, a sync HTTP client, a C library
    return hashlib.sha256(data).hexdigest()[:12]


async def to_thread_demo() -> None:
    beats = 0

    async def heartbeat() -> None:
        nonlocal beats
        for _ in range(5):
            beats += 1
            await asyncio.sleep(0.01)

    # to_thread runs the blocking function in a worker thread, so the event loop
    # keeps serving other tasks while it waits.
    digest, _ = await asyncio.gather(asyncio.to_thread(hash_file_contents, b"report"), heartbeat())
    assert len(digest) == 12
    assert beats == 5  # the heartbeat kept running during the blocking call


asyncio.run(to_thread_demo())
# endregion to-thread
