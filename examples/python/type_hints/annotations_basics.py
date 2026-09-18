"""Annotating functions: the everyday 90%.

Annotations are not enforced at runtime - mypy (or pyright) checks them.
This file passes `mypy --strict` and also runs.

Run it: python3 annotations_basics.py
"""

from collections.abc import Callable, Iterable, Mapping, Sequence
from typing import Any, TypedDict, Unpack


# region basic-annotations
def greet(name: str, excited: bool = False) -> str:
    return f"Hello, {name}{'!' if excited else '.'}"


def log_line(message: str) -> None:  # returns nothing -> None, always spell it out
    print(message)


# Builtin generics are subscripted directly (3.9+): list[int], dict[str, int],
# tuple[int, str], set[str]. No `from typing import List` any more.
def split_pairs(raw: str) -> dict[str, int]:
    return {key: int(value) for key, value in (pair.split("=") for pair in raw.split(","))}


assert split_pairs("a=1,b=2") == {"a": 1, "b": 2}

# Fixed-length tuple vs homogeneous tuple of any length:
origin: tuple[float, float] = (0.0, 0.0)
ids: tuple[int, ...] = (1, 2, 3, 4)
# endregion basic-annotations


# region optional
# `X | None` (3.10+) replaces Optional[X]. The checker forces you to narrow it.
def find_user(user_id: int) -> str | None:
    return {1: "ada", 2: "linus"}.get(user_id)


def display_name(user_id: int) -> str:
    name = find_user(user_id)
    # name.upper()  <- mypy: Item "None" of "str | None" has no attribute "upper"
    if name is None:
        return "<unknown>"
    return name.upper()  # narrowed to str here


assert display_name(1) == "ADA"
assert display_name(99) == "<unknown>"
# endregion optional


# region abstract-params
# Accept the most general type you can use; return the most specific type you have.
# Sequence/Mapping/Iterable are read-only views, so callers may pass a list,
# tuple, range, dict, ... and the function promises not to mutate them.
def average(values: Iterable[float]) -> float:
    items = list(values)
    return sum(items) / len(items) if items else 0.0


def first_or(items: Sequence[str], default: str) -> str:
    return items[0] if items else default


def total_stock(stock: Mapping[str, int]) -> int:
    return sum(stock.values())


assert average([1, 2, 3]) == 2.0  # list[int] is fine: int is accepted where float is expected
assert average(x / 2 for x in range(3)) == 0.5  # so is a generator
assert first_or(("a", "b"), "z") == "a"  # and a tuple
assert total_stock({"apples": 3}) == 3


# Why not list[float]? list is *invariant*: a list[int] is NOT a list[float],
# because the function could append a float to the caller's list of ints.
def append_half(values: list[float]) -> None:
    values.append(0.5)


ints: list[int] = [1, 2]
# append_half(ints)  <- mypy: Argument 1 to "append_half" has incompatible type "list[int]"; expected "list[float]"
# endregion abstract-params


# region aliases
# The `type` statement (3.12+) creates an explicit, lazily evaluated alias.
type UserId = int
type Json = str | int | float | bool | list[Json] | dict[str, Json] | None  # recursive is fine
type Handler = Callable[[str, int], bool]


def parse_flag(raw: Json) -> bool:
    return raw is True or raw == "true"


def run_handler(handler: Handler, user: UserId) -> bool:
    return handler("login", user)


assert parse_flag("true")
assert run_handler(lambda event, user: event == "login" and user > 0, 7)
# endregion aliases


# region callables
# Callable[[arg types...], return type]
def apply_twice(func: Callable[[int], int], value: int) -> int:
    return func(func(value))


def retry(action: Callable[[], str], attempts: int = 3) -> str:  # takes no arguments
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return action()
        except ValueError as error:
            last_error = error
    raise RuntimeError("gave up") from last_error


def on_event(callback: Callable[..., None]) -> None:  # any arguments - use sparingly
    callback(1, "two", three=3)


assert apply_twice(lambda n: n * 3, 2) == 18
assert retry(lambda: "ok") == "ok"
# endregion callables


# region args-kwargs
# The annotation on *args / **kwargs is the type of EACH item, not the container.
def join_all(*parts: str, sep: str = " ") -> str:  # parts: tuple[str, ...]
    return sep.join(parts)


def tag(**attributes: str | int) -> str:  # attributes: dict[str, str | int]
    return " ".join(f'{key}="{value}"' for key, value in attributes.items())


assert join_all("a", "b", sep="-") == "a-b"
assert tag(id="main", tabindex=0) == 'id="main" tabindex="0"'


# For **kwargs with a fixed, known set of keys, use a TypedDict with Unpack.
class RequestOptions(TypedDict, total=False):
    timeout: float
    retries: int


def request(url: str, **options: Unpack[RequestOptions]) -> str:
    return f"GET {url} timeout={options.get('timeout', 5.0)} retries={options.get('retries', 0)}"


assert request("/users", retries=2) == "GET /users timeout=5.0 retries=2"
# request("/users", retry=2)  <- mypy: Unexpected keyword argument "retry"
# endregion args-kwargs


# region any-vs-object
# `Any` switches the checker OFF for that value. `object` means "anything" but
# stays checked: you must narrow it before doing something type-specific.
def describe_any(value: Any) -> str:
    result: str = value.whatever()  # mypy accepts this; it crashes at runtime
    return result


def describe_object(value: object) -> str:
    # value.upper()  <- mypy: "object" has no attribute "upper"
    if isinstance(value, str):
        return value.upper()
    return repr(value)


assert describe_object("hi") == "HI"
assert describe_object(3) == "3"
# endregion any-vs-object

print("all annotation examples hold")
