"""Parse at the boundary, trust inside: TypeAdapter for non-model types, settings from the environment.

Run it: python3 boundaries.py   (needs `pip install pydantic`)
"""
# check-python: requires pydantic

import json
from dataclasses import dataclass
from typing import Annotated, Literal, TypedDict

from pydantic import Field, TypeAdapter, ValidationError


# region type-adapter
# Not everything has to be a BaseModel. TypeAdapter validates any type: a TypedDict,
# a dataclass, a list of them, a union...
class Event(TypedDict):
    kind: Literal["click", "view"]
    at_ms: Annotated[int, Field(ge=0)]


@dataclass(frozen=True)
class Point:
    x: float
    y: float


events = TypeAdapter(list[Event]).validate_json(
    '[{"kind": "click", "at_ms": 10}, {"kind": "view", "at_ms": 25}]'
)
assert events == [{"kind": "click", "at_ms": 10}, {"kind": "view", "at_ms": 25}]

point = TypeAdapter(Point).validate_python({"x": "1.5", "y": 2})
assert point == Point(1.5, 2.0)

# Build adapters once, at module level: constructing one compiles a validator.
EVENTS = TypeAdapter(list[Event])
try:
    EVENTS.validate_python([{"kind": "scroll", "at_ms": -1}])
except ValidationError as error:
    print(f"  {error.error_count()} errors, e.g. {error.errors()[0]['msg']}")
# endregion type-adapter


# region discriminated-union
class Card(TypedDict):
    method: Literal["card"]
    last4: Annotated[str, Field(pattern=r"^\d{4}$")]


class Iban(TypedDict):
    method: Literal["iban"]
    iban: str


# `discriminator` makes pydantic look at "method" first and validate only that branch,
# so errors talk about the branch the input meant, not every possible one.
Payment = Annotated[Card | Iban, Field(discriminator="method")]
PAYMENT = TypeAdapter(Payment)

assert PAYMENT.validate_python({"method": "card", "last4": "4242"}) == {"method": "card", "last4": "4242"}
try:
    PAYMENT.validate_python({"method": "card", "last4": "42"})
except ValidationError as error:
    assert error.errors()[0]["loc"] == ("card", "last4")
# endregion discriminated-union


# region boundary
def handle_request(body: bytes) -> str:
    """The edge of the program: untrusted bytes in, typed values (or a 400) out."""
    try:
        batch = EVENTS.validate_json(body)
    except ValidationError as error:
        return f"400 {json.dumps(error.errors(include_url=False, include_context=False)[0]['msg'])}"
    return summarise(batch)


def summarise(batch: list[Event]) -> str:
    # Inside: no re-checking, no isinstance(), no "if 'kind' in event" - the type says it all.
    clicks = sum(1 for event in batch if event["kind"] == "click")
    return f"200 {clicks} clicks"


assert handle_request(b'[{"kind": "click", "at_ms": 1}]') == "200 1 clicks"
assert handle_request(b'[{"kind": "click"}]') == '400 "Field required"'
# endregion boundary
