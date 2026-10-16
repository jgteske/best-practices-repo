"""Memoization with functools: cache, lru_cache, cached_property - and the method-cache leak.

Run it: python3 caching.py
"""

import gc
import weakref
from functools import cache, cached_property, lru_cache

# region cache
calls = 0


@cache  # unbounded: every distinct argument is kept forever
def fib(n: int) -> int:
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)


assert fib(80) == 23416728348467685
assert calls == 81  # each n computed once; uncached, this would be ~10^16 calls
# endregion cache


# region lru-cache
@lru_cache(maxsize=2)  # bounded: evicts the least recently used entry
def lookup(key: str) -> str:
    return key.upper()


for key in ("a", "b", "a", "c", "b"):
    lookup(key)
info = lookup.cache_info()
assert (info.hits, info.misses, info.currsize) == (1, 4, 2)  # "b" was evicted by "c", then missed again
print(f"  {info}")
lookup.cache_clear()  # e.g. between tests

# Arguments are the cache key, so they must be hashable:
try:
    lookup(["a"])  # type: ignore[arg-type]
except TypeError as error:
    print(f"  {error}")
# endregion lru-cache


# region cached-property
class Report:
    def __init__(self, rows: list[int]) -> None:
        self.rows = rows
        self.computed = 0

    @cached_property  # computed on first access, then stored on the instance
    def total(self) -> int:
        self.computed += 1
        return sum(self.rows)


report = Report([1, 2, 3])
assert report.total == 6 and report.total == 6
assert report.computed == 1
del report.total  # invalidate: the next access recomputes
report.rows.append(4)
assert report.total == 10 and report.computed == 2
# endregion cached-property


# region method-leak
class Model:
    @cache  # noqa: B019 - this is the bug being demonstrated
    def predict(self, x: int) -> int:
        return x * 2


model = Model()
model.predict(1)
ref = weakref.ref(model)
del model
gc.collect()
# The cache is on the *class* and its keys include `self`, so the instance never dies.
assert ref() is not None
print("  instance still alive after `del`: the method cache holds it")
Model.predict.cache_clear()
gc.collect()
assert ref() is None
# Fixes: cache a module-level function, use cached_property, or give each instance
# its own cache in __init__ (self.predict = lru_cache(self._predict)).
# endregion method-leak
