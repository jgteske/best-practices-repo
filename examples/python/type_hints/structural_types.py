"""Describing shapes: Literal, TypedDict, Protocol, NewType and Final.

Run it: python3 structural_types.py
"""

from typing import Final, Literal, NewType, NotRequired, Protocol, ReadOnly, TypedDict, runtime_checkable

# region literal
type Method = Literal["GET", "POST", "DELETE"]


def call(method: Method, path: str) -> str:
    return f"{method} {path}"


assert call("GET", "/") == "GET /"
# call("PATCH", "/")  <- mypy: Argument 1 to "call" has incompatible type "Literal['PATCH']"; expected "Literal['GET', 'POST', 'DELETE']"
# endregion literal


# region typeddict
# A TypedDict describes a dict with known keys - the shape of parsed JSON.
# At runtime it IS a plain dict; there is no validation.
class Address(TypedDict):
    city: str
    zip: str


class User(TypedDict):
    id: ReadOnly[int]  # 3.13+: may not be reassigned
    name: str
    email: NotRequired[str]  # key may be missing entirely
    address: Address


def mailing_label(user: User) -> str:
    email = user.get("email", "no email")  # NotRequired -> use .get()
    return f"{user['name']} <{email}>, {user['address']['city']}"


ada: User = {"id": 1, "name": "Ada", "address": {"city": "London", "zip": "N1"}}
assert mailing_label(ada) == "Ada <no email>, London"
assert type(ada).__name__ == "dict"  # just a dict at runtime
# ada["id"] = 2  <- mypy: ReadOnly TypedDict key "id" TypedDict is mutated
# endregion typeddict


# region protocol
# A Protocol is structural typing ("duck typing, checked"): any class with a
# matching method satisfies it - no inheritance, no registration.
class SupportsClose(Protocol):
    def close(self) -> None: ...


class File:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


class Socket:
    def close(self) -> None:
        pass


def close_all(resources: list[SupportsClose]) -> int:
    for resource in resources:
        resource.close()
    return len(resources)


assert close_all([File(), Socket()]) == 2  # neither class mentions SupportsClose


# @runtime_checkable enables isinstance(), which only checks method NAMES exist.
@runtime_checkable
class Named(Protocol):
    @property
    def name(self) -> str: ...


class Service:
    name = "billing"


assert isinstance(Service(), Named)
assert not isinstance(42, Named)
# endregion protocol


# region newtype
# NewType makes a distinct type for the checker at zero runtime cost:
# an OrderId is an int, but an int is not an OrderId.
OrderId = NewType("OrderId", int)
CustomerId = NewType("CustomerId", int)


def cancel(order: OrderId) -> str:
    return f"cancelled {order}"


order = OrderId(42)
assert cancel(order) == "cancelled 42"
# cancel(CustomerId(42))  <- mypy: Argument 1 to "cancel" has incompatible type "CustomerId"; expected "OrderId"
# endregion newtype

# region final
MAX_RETRIES: Final = 3  # inferred as Literal[3]; reassignment is an error
# MAX_RETRIES = 4  <- mypy: Cannot assign to final name "MAX_RETRIES"
# endregion final

print("all structural typing examples hold")
