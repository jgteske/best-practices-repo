# Performance & Caching

Two habits make Python code fast: **measure before you change anything**, and
**don't compute the same thing twice**. The standard library has tools for
both: `timeit`, `cProfile` and `tracemalloc` for measuring, and `functools` for
caching.

Examples: [`examples/python/performance`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/performance).

## Measure first

### `timeit` for small pieces

<<< ../../examples/python/performance/measuring.py#timeit

```
  join_concat     90.5 µs per call
  join_list       70.3 µs per call
```

The textbook advice says "never build strings with `+=`". It turns out to be a
~20% difference here, because CPython optimises in-place string concatenation.
The `join` version is still the right habit, but only measuring tells you the
real size of the gain. Use `repeat()` and take the **minimum**. Slower runs are
noise from the GC, the OS or other processes, not a property of your code.

### `cProfile` for whole programs

<<< ../../examples/python/performance/measuring.py#cprofile

```
  top of the profile:
    1    0.004    0.004    0.167    0.167 measuring.py:50(program)
    1    0.148    0.148    0.148    0.148 measuring.py:42(slow_unique)
    1    0.006    0.006    0.014    0.014 measuring.py:38(parse)
    20001    0.005    0.000    0.008    0.000 measuring.py:39(<genexpr>)
```

The columns are: call count, time spent in the function itself (`tottime`), per
call, time including everything it called (`cumtime`), and per call.
`slow_unique` takes 90% of the run. Its `name not in seen` scans a list, so
each check gets slower as the list grows. Changing `seen` to a `set` (or using
`dict.fromkeys(names)`, which keeps order) fixes the whole program. Guessing
would probably have pointed at `parse`.

For a running service, or when profiler overhead distorts the result, use a
sampling profiler: [py-spy](https://github.com/benfred/py-spy) attaches to a
live process, and [Scalene](https://github.com/plasma-umass/scalene) also
reports memory.

### `tracemalloc` for memory

<<< ../../examples/python/performance/measuring.py#memory

```
  10k points: 1414 KiB with __dict__, 1018 KiB with __slots__
```

`@dataclass(slots=True)` (3.10+) stores fields in fixed slots instead of a
per-instance `__dict__`. Memory drops by about a quarter, and attribute access
gets faster. The price is that you can't add attributes the class didn't
declare. A generator holds one item at a time, so pipelines over large inputs
should stay lazy (see [Iterators & Generators](./iterators-and-generators)).

## Caching with `functools`

### `@cache`: memoize a pure function

<<< ../../examples/python/performance/caching.py#cache

`@cache` stores every result keyed by the arguments. It suits **pure**
functions (same input, same output, no side effects) that you call repeatedly
with the same arguments. Memoizing the recursive Fibonacci turns ~10¹⁶ calls
into 81. The cache is **unbounded**, so use it only when the set of distinct
arguments is small.

### `@lru_cache(maxsize=...)`: bounded

<<< ../../examples/python/performance/caching.py#lru-cache

```
  CacheInfo(hits=1, misses=4, maxsize=2, currsize=2)
  unhashable type: 'list'
```

`lru_cache` evicts the least recently used entry once it holds `maxsize`
results. `cache_info()` shows whether the cache is earning its keep. A low hit
rate means it is only using memory. Arguments must be hashable, so pass
tuples, not lists. Clear caches between tests with `cache_clear()`.

### `@cached_property`: compute once per instance

<<< ../../examples/python/performance/caching.py#cached-property

The value is stored on the instance on first access. `del obj.attr`
invalidates it. Nothing invalidates it automatically, so if the inputs change
(here `rows.append`), the cached value is stale until you delete it.
`cached_property` needs an instance `__dict__`, so it doesn't work with
`slots=True`.

### The method-cache leak

<<< ../../examples/python/performance/caching.py#method-leak

```
  instance still alive after `del`: the method cache holds it
```

`@cache` on a **method** stores one cache on the class, and `self` is part of
every key. Each instance you ever call it on stays in memory for as long as
the class exists. ruff flags this as `B019`. Cache a module-level function,
use `cached_property`, or build a per-instance cache in `__init__`.

## What else usually helps

| Change | Typical win |
| --- | --- |
| A better data structure (`set`/`dict` lookups instead of list scans) | turns O(n²) into O(n) |
| Push loops into C: built-ins, `sum`, `sorted`, comprehensions, `str.join` | 2-10x |
| Batch I/O: one query with `IN (...)`, one transaction ([SQLite](./sqlite#batch-writes-in-one-transaction)) | 10-100x |
| NumPy / pandas / Polars for numeric columns | 10-100x |
| Processes for CPU-bound work ([Threads vs Processes](./threads-and-processes)) | ×cores |
| Upgrading Python (3.11 was ~25% faster than 3.10) | free |

## Rules of thumb

- Profile the real workload before you optimise. The hot spot is rarely where you expect.
- With `timeit`, take the minimum of several repeats.
- Use `@cache` only for pure functions with few distinct arguments, and `lru_cache(maxsize=...)` otherwise.
- Never put `@cache`/`@lru_cache` on methods.
- Use `slots=True` for classes with many instances. Keep large pipelines lazy.
- Better algorithms and data structures beat micro-optimisation.
