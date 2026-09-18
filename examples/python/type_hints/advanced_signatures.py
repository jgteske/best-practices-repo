"""Overloads, typed decorators, Self, narrowing helpers and exhaustiveness.

Run it: python3 advanced_signatures.py
"""

import functools
from collections.abc import Callable, Sequence
from typing import Literal, Never, Self, TypeIs, assert_never, overload


# region overload
# When the return type depends on the argument VALUE, a union return type makes
# every caller narrow. @overload lets the checker pick the right one instead.
@overload
def fetch(key: str, *, many: Literal[False] = ...) -> str: ...
@overload
def fetch(key: str, *, many: Literal[True]) -> list[str]: ...
def fetch(key: str, *, many: bool = False) -> str | list[str]:
    # The implementation's signature is not visible to callers.
    return [key, key] if many else key


one = fetch("a")  # mypy: str
several = fetch("a", many=True)  # mypy: list[str]
assert one.upper() == "A"
assert several == ["a", "a"]
# endregion overload


# region paramspec
# A typed decorator keeps the wrapped function's parameters (P) and return type (R).
def logged[**P, R](func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"  calling {func.__name__}{args}")
        return func(*args, **kwargs)

    return wrapper


@logged
def scale(value: float, factor: float = 2.0) -> float:
    return value * factor


assert scale(3.0, factor=3) == 9.0
# scale("3")  <- mypy: Argument 1 to "scale" has incompatible type "str"; expected "float"


# A decorator factory (takes arguments) is one more layer of functions.
def retry[**P, R](times: int) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorate(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except ConnectionError:
                    if attempt == times:
                        raise
            raise AssertionError("unreachable")

        return wrapper

    return decorate


calls: list[int] = []


@retry(times=3)
def flaky() -> str:
    calls.append(1)
    if len(calls) < 3:
        raise ConnectionError("try again")
    return "connected"


assert flaky() == "connected" and len(calls) == 3
# endregion paramspec


# region self
# `Self` is "the class this is called on" - so subclasses keep their own type
# through fluent methods and alternative constructors.
class QueryBuilder:
    def __init__(self) -> None:
        self.parts: list[str] = []

    def where(self, clause: str) -> Self:
        self.parts.append(clause)
        return self

    @classmethod
    def create(cls) -> Self:
        return cls()


class UserQuery(QueryBuilder):
    def active(self) -> Self:
        return self.where("active = true")


query = UserQuery.create().where("age > 18").active()  # still a UserQuery
assert query.parts == ["age > 18", "active = true"]
# endregion self


# region typeis
# A user-defined narrowing function. TypeIs (3.13+) narrows in BOTH branches;
# the older TypeGuard only narrows the True branch. The narrowed type must be a
# subtype of the input, which is why this takes the covariant Sequence: a
# list[str] is not a list[object] (invariance), but a Sequence[str] is a
# Sequence[object].
def is_str_seq(values: Sequence[object]) -> TypeIs[Sequence[str]]:
    return all(isinstance(value, str) for value in values)


def shout(values: Sequence[object]) -> str:
    if is_str_seq(values):
        return " ".join(values).upper()  # values: Sequence[str] here
    return "not all strings"


assert shout(["a", "b"]) == "A B"
assert shout(["a", 1]) == "not all strings"
# endregion typeis

# region exhaustive
type Shape = Literal["circle", "square", "triangle"]


def corners(shape: Shape) -> int:
    match shape:
        case "circle":
            return 0
        case "square":
            return 4
        case "triangle":
            return 3
        case _:
            # If someone adds "hexagon" to Shape and forgets a case, mypy
            # reports: Argument 1 to "assert_never" has incompatible type "Literal['hexagon']"
            assert_never(shape)


def fail(message: str) -> Never:  # Never: this function does not return
    raise SystemExit(message)


assert [corners(s) for s in ("circle", "square", "triangle")] == [0, 4, 3]
# endregion exhaustive

print("all advanced signature examples hold")
