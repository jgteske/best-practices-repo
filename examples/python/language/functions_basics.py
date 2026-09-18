"""Parameters, defaults, closures and decorators - untyped concerns first.

Typing all of this is covered in typing/*.py.

Run it: python3 functions_basics.py
"""

import functools
import time
from collections.abc import Callable


# region parameter-kinds
#         positional-only | normal         | keyword-only
def connect(host: str, /, port: int = 5432, *, timeout: float = 5.0) -> str:
    return f"{host}:{port} (timeout={timeout})"


assert connect("db") == "db:5432 (timeout=5.0)"
assert connect("db", 6543, timeout=1) == "db:6543 (timeout=1)"
assert connect("db", port=6543) == "db:6543 (timeout=5.0)"
# connect(host="db")   TypeError: host is positional-only
# connect("db", 1, 2)  TypeError: timeout is keyword-only


def log(message: str, *args: object, **fields: object) -> str:
    # *args collects extra positionals into a tuple, **fields extra keywords into a dict.
    return f"{message % args} {fields}"


line = log("%s logged in from %s", "ada", "10.0.0.1", level="info")
assert line == "ada logged in from 10.0.0.1 {'level': 'info'}"

# The same stars unpack at the call site.
options = {"port": 6543, "timeout": 1}
assert connect("db", **options) == "db:6543 (timeout=1)"
# endregion parameter-kinds


# region mutable-default
# Defaults are evaluated ONCE, when `def` runs - not on every call.
def append_bad(item: int, bucket: list[int] = []) -> list[int]:  # noqa: B006
    bucket.append(item)
    return bucket


append_bad(1)
assert append_bad(2) == [1, 2]  # the "empty" default remembered the first call


def append_good(item: int, bucket: list[int] | None = None) -> list[int]:
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket


append_good(1)
assert append_good(2) == [2]
# endregion mutable-default


# region closures
def make_counter() -> Callable[[], int]:
    count = 0

    def increment() -> int:
        nonlocal count  # without this, `count += 1` would create a new local
        count += 1
        return count

    return increment


counter = make_counter()
counter()
assert counter() == 2

# Closures capture variables, not values - the late-binding trap:
callbacks: list[Callable[[], int]] = [lambda: i for i in range(3)]  # noqa: B023
assert [cb() for cb in callbacks] == [2, 2, 2]


def returns(value: int) -> Callable[[], int]:
    return lambda: value  # each call gets its own `value`


callbacks = [returns(i) for i in range(3)]  # bind now: one scope per callback
assert [cb() for cb in callbacks] == [0, 1, 2]
# endregion closures


# region decorators
# A decorator is a function that takes a function and returns a replacement.
def timed[**P, R](func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)  # keep __name__, __doc__, and the signature for tools
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"  {func.__name__} took {time.perf_counter() - start:.4f}s")

    return wrapper


@timed  # same as: slow_add = timed(slow_add)
def slow_add(a: int, b: int) -> int:
    """Add two numbers, slowly."""
    time.sleep(0.01)
    return a + b


assert slow_add(2, 3) == 5
assert slow_add.__name__ == "slow_add"  # thanks to functools.wraps


# Built-in decorators worth knowing:
@functools.cache
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)


assert fib(80) == 23416728348467685  # instant: every sub-result is memoised
# endregion decorators

print("all function assertions hold")
