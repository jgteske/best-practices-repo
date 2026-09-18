"""The iteration protocol, generators, and itertools.

Run it: python3 iterators_and_generators.py
"""

import itertools
from collections.abc import Generator, Iterable, Iterator
from pathlib import Path

# region protocol
# `for x in obj` calls iter(obj) once, then next() until StopIteration.
numbers = [1, 2]
iterator = iter(numbers)
assert next(iterator) == 1
assert next(iterator) == 2
assert next(iterator, "done") == "done"  # a default instead of StopIteration

# An iterable can be iterated many times; an iterator only once.
squares = (n * n for n in range(3))  # a generator is an iterator
assert list(squares) == [0, 1, 4]
assert list(squares) == []  # exhausted - the classic silent bug
# endregion protocol


# region generators
# `yield` turns a function into a generator: it runs lazily, one value per next().
def countdown(start: int) -> Iterator[int]:
    print(f"  countdown({start}) started")
    while start > 0:
        yield start
        start -= 1


gen = countdown(3)  # nothing printed yet: the body has not started
assert next(gen) == 3  # now it runs up to the first yield
assert list(gen) == [2, 1]


# Lazy pipelines: each stage pulls one item at a time, so memory stays flat no
# matter how large the input is.
def read_lines(lines: Iterable[str]) -> Iterator[str]:
    for line in lines:
        yield line.rstrip("\n")


def non_comments(lines: Iterable[str]) -> Iterator[str]:
    return (line for line in lines if line and not line.startswith("#"))


raw = ["# header\n", "alpha\n", "\n", "beta\n"]
assert list(non_comments(read_lines(raw))) == ["alpha", "beta"]


# `yield from` delegates to another iterable.
def walk(tree: dict[str, object], prefix: str = "") -> Iterator[str]:
    for name, child in tree.items():
        yield prefix + name
        if isinstance(child, dict):
            yield from walk(child, prefix + name + "/")


assert list(walk({"src": {"app": {}, "lib": {}}, "README": None})) == [
    "src",
    "src/app",
    "src/lib",
    "README",
]
# endregion generators


# region generator-send
# Full Generator[Yield, Send, Return] type - only needed when you use send()
# or a return value; plain generators are just Iterator[T].
def running_average() -> Generator[float, float]:  # 3.13: Return defaults to None
    total, count, average = 0.0, 0, 0.0
    while True:
        value = yield average
        total, count = total + value, count + 1
        average = total / count


averager = running_average()
next(averager)  # prime it: run to the first yield
assert averager.send(10) == 10
assert averager.send(20) == 15
# endregion generator-send


# region custom-iterable
# A class is iterable if __iter__ returns an iterator. Making __iter__ a
# generator is the shortest correct way - and every call gets a fresh one.
class Playlist:
    def __init__(self, *songs: str) -> None:
        self._songs = list(songs)

    def __iter__(self) -> Iterator[str]:
        yield from self._songs


playlist = Playlist("intro", "outro")
assert list(playlist) == list(playlist) == ["intro", "outro"]  # re-iterable
# endregion custom-iterable

# region itertools
# batched (3.12+); strict=True (3.13+) raises instead of yielding a short last batch.
assert list(itertools.batched("abcdefg", 3, strict=False)) == [("a", "b", "c"), ("d", "e", "f"), ("g",)]
assert list(itertools.chain([1, 2], (3,))) == [1, 2, 3]
assert list(itertools.islice(itertools.count(10), 3)) == [10, 11, 12]  # slice an infinite iterator
assert list(itertools.pairwise([1, 4, 9])) == [(1, 4), (4, 9)]
assert list(itertools.accumulate([1, 2, 3])) == [1, 3, 6]
assert list(itertools.product("ab", [0, 1])) == [("a", 0), ("a", 1), ("b", 0), ("b", 1)]

# groupby only groups ADJACENT equal keys - sort by the same key first.
words = sorted(["apple", "bean", "avocado", "beet"], key=lambda w: w[0])
grouped = {key: list(group) for key, group in itertools.groupby(words, key=lambda w: w[0])}
assert grouped == {"a": ["apple", "avocado"], "b": ["bean", "beet"]}

# any()/all() short-circuit, and so do generators fed to them.
assert any(Path(p).suffix == ".py" for p in ["a.txt", "b.py", "c.md"])
# endregion itertools

print("all iteration examples hold")
