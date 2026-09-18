"""Generic functions and classes with the PEP 695 syntax (3.12+).

Run it: python3 generics.py
"""

from collections.abc import Callable, Hashable, Iterable, Sequence
from dataclasses import dataclass, field
from decimal import Decimal


# region generic-functions
# `[T]` declares a type parameter scoped to this one function. The return type
# is tied to the argument type: first([1, 2]) is int, first(["a"]) is str.
def first[T](items: Sequence[T]) -> T | None:
    return items[0] if items else None


def group_by[T, K: Hashable](items: Iterable[T], key: Callable[[T], K]) -> dict[K, list[T]]:
    groups: dict[K, list[T]] = {}
    for item in items:
        groups.setdefault(key(item), []).append(item)
    return groups


number = first([10, 20])  # mypy infers: int | None
word = first(["a"])  # mypy infers: str | None
assert number == 10 and word == "a"
assert group_by(["apple", "avocado", "bean"], key=lambda w: w[0]) == {
    "a": ["apple", "avocado"],
    "b": ["bean"],
}
# endregion generic-functions


# region bounds-and-constraints
# Bound `T: Base`: T may be Base or any subtype, and T is preserved.
class Comparable:
    def __init__(self, rank: int) -> None:
        self.rank = rank


class Card(Comparable):
    def __init__(self, rank: int, suit: str) -> None:
        super().__init__(rank)
        self.suit = suit


def highest[T: Comparable](items: Sequence[T]) -> T:
    return max(items, key=lambda item: item.rank)


best = highest([Card(3, "hearts"), Card(12, "spades")])
assert best.suit == "spades"  # still a Card - a bound keeps the concrete type


# Constraints `T: (A, B)`: T must be exactly one of the listed types.
def double[N: (int, float, Decimal)](value: N) -> N:
    return value * 2


assert double(2) == 4
assert double(Decimal("1.5")) == Decimal("3.0")
# endregion bounds-and-constraints


# region generic-classes
@dataclass
class Stack[T]:
    _items: list[T] = field(default_factory=list)

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("pop from an empty stack")
        return self._items.pop()

    def __len__(self) -> int:
        return len(self._items)


ints = Stack[int]()
ints.push(1)
# ints.push("two")  <- mypy: Argument 1 to "push" of "Stack" has incompatible type "str"; expected "int"
assert ints.pop() == 1


# Two type parameters and a default for the second (3.13+, PEP 696).
@dataclass(frozen=True)
class Result[T, E = str]:
    value: T | None = None
    error: E | None = None

    @property
    def ok(self) -> bool:
        return self.error is None


def parse_port(raw: str) -> Result[int]:  # E defaults to str
    if not raw.isdigit():
        return Result(error=f"not a number: {raw!r}")
    return Result(value=int(raw))


assert parse_port("8080").value == 8080
assert not parse_port("http").ok
# endregion generic-classes

print("all generics examples hold")
