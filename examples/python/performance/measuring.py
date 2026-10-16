"""Measure before optimising: timeit for micro-benchmarks, cProfile for programs, tracemalloc for memory.

Run it: python3 measuring.py
"""

import cProfile
import io
import pstats
import sys
import timeit
import tracemalloc
from dataclasses import dataclass
from functools import partial


# region timeit
def join_concat(n: int) -> str:
    out = ""
    for i in range(n):
        out += str(i)
    return out


def join_list(n: int) -> str:
    return "".join(str(i) for i in range(n))


# repeat() runs the whole measurement several times; take the MINIMUM - the other runs
# are slower only because something else (GC, the OS, another process) got in the way.
for fn in (join_concat, join_list):
    best = min(timeit.repeat(partial(fn, 1_000), number=200, repeat=5))
    print(f"  {fn.__name__:<12} {best / 200 * 1e6:7.1f} µs per call")
# From a shell: python -m timeit -s "from mod import f" "f(1000)"
# endregion timeit


# region cprofile
def parse(lines: list[str]) -> list[tuple[str, int]]:
    return [(name, int(value)) for name, value in (line.split("=") for line in lines)]


def slow_unique(items: list[tuple[str, int]]) -> list[str]:
    seen: list[str] = []  # list membership is O(n): the hot spot
    for name, _ in items:
        if name not in seen:
            seen.append(name)
    return seen


def program() -> None:
    lines = [f"key{i % 2_000}={i}" for i in range(20_000)]
    slow_unique(parse(lines))


profiler = cProfile.Profile()
profiler.runcall(program)
out = io.StringIO()
stats = pstats.Stats(profiler, stream=out).strip_dirs().sort_stats("cumulative")
stats.print_stats(4)  # top 4 entries by cumulative time
top = [line for line in out.getvalue().splitlines() if "measuring.py" in line]
assert any("slow_unique" in line for line in top)
print("  top of the profile:", *(f"    {line.strip()}" for line in top), sep="\n")
# From a shell: python -m cProfile -s cumulative script.py   (or py-spy / scalene for live programs)
# endregion cprofile


# region memory
@dataclass
class PointDict:
    x: float
    y: float


@dataclass(slots=True)  # no per-instance __dict__: smaller and faster attribute access
class PointSlots:
    x: float
    y: float


def peak_bytes(build: type[PointDict] | type[PointSlots]) -> int:
    tracemalloc.start()
    points = [build(float(i), float(i)) for i in range(10_000)]
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    del points
    return peak


with_dict, with_slots = peak_bytes(PointDict), peak_bytes(PointSlots)
assert with_slots < with_dict
print(f"  10k points: {with_dict // 1024} KiB with __dict__, {with_slots // 1024} KiB with __slots__")

# A generator holds one item at a time; a list holds all of them.
squares_list = [i * i for i in range(100_000)]
squares_gen = (i * i for i in range(100_000))
assert sys.getsizeof(squares_gen) < 1_000 < sys.getsizeof(squares_list)
assert sum(squares_gen) == sum(squares_list)
# endregion memory
