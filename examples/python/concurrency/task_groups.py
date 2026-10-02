"""Structured concurrency with TaskGroup, failures, and cancellation.

Run it: python3 task_groups.py
"""

import asyncio
import contextlib


async def load(name: str, delay: float, *, fail: bool = False) -> str:
    await asyncio.sleep(delay)
    if fail:
        raise ConnectionError(f"{name} unreachable")
    return name.upper()


# region task-group
async def load_dashboard() -> dict[str, str]:
    # Every task started in the group is awaited before the `async with` block exits.
    # No task can outlive the block, so none can be forgotten or leak.
    async with asyncio.TaskGroup() as group:
        user = group.create_task(load("user", 0.02))
        orders = group.create_task(load("orders", 0.01))
    return {"user": user.result(), "orders": orders.result()}


assert asyncio.run(load_dashboard()) == {"user": "USER", "orders": "ORDERS"}
# endregion task-group


# region task-group-failure
cancelled: list[str] = []


async def slow_widget() -> str:
    try:
        return await load("widget", 1.0)
    except asyncio.CancelledError:
        cancelled.append("widget")
        raise  # always re-raise CancelledError, or cancellation silently breaks


async def failing_dashboard() -> None:
    async with asyncio.TaskGroup() as group:
        group.create_task(slow_widget())
        group.create_task(load("orders", 0.01, fail=True))


try:
    asyncio.run(failing_dashboard())
except* ConnectionError as group:
    # A TaskGroup always raises an ExceptionGroup, even when only one task failed.
    print(f"  failed: {[str(error) for error in group.exceptions]}")

# The first failure cancelled the sibling that was still running.
assert cancelled == ["widget"]
# endregion task-group-failure


# region cancellation
events: list[str] = []


async def worker() -> None:
    try:
        while True:
            await asyncio.sleep(0.01)
            events.append("tick")
    finally:
        # Runs on cancellation too: release locks, close connections here.
        events.append("cleaned up")


async def cancel_demo() -> None:
    task = asyncio.create_task(worker())
    await asyncio.sleep(0.035)
    task.cancel()  # requests cancellation: CancelledError is raised at the task's next await
    with contextlib.suppress(asyncio.CancelledError):
        await task
    assert task.cancelled()


asyncio.run(cancel_demo())
assert events[-1] == "cleaned up" and "tick" in events
# endregion cancellation
