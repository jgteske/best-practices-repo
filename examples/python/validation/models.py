"""pydantic models: one class is both the runtime check and the static type.

Run it: python3 models.py   (needs `pip install pydantic`)
"""
# check-python: requires pydantic

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator


# region model
class Role(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"


class Address(BaseModel):
    city: str
    postcode: Annotated[str, Field(pattern=r"^\d{5}$")]


class User(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)  # unknown keys are errors; instances immutable

    id: int
    email: Annotated[str, Field(min_length=3, max_length=254)]
    name: str
    role: Role = Role.MEMBER
    tags: list[str] = []  # safe: pydantic copies mutable defaults per instance
    address: Address | None = None
    created_at: datetime

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        if "@" not in value:
            raise ValueError("must contain @")
        return value.strip().lower()

    @field_validator("created_at")
    @classmethod
    def must_be_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("must include a time zone")
        return value.astimezone(UTC)


# endregion model


# region validate
# model_validate() for dicts (e.g. from json.loads or a form), model_validate_json() for raw bytes/str.
payload = b"""{
    "id": "42",
    "email": "  Ada@Example.COM ",
    "name": "Ada",
    "role": "admin",
    "address": {"city": "Berlin", "postcode": "10115"},
    "created_at": "2026-03-01T09:30:00+01:00"
}"""
user = User.model_validate_json(payload)
assert user.id == 42  # lax mode: the numeric string "42" was converted to an int
assert user.email == "ada@example.com"
assert user.role is Role.ADMIN
assert user.address is not None and user.address.city == "Berlin"
assert user.created_at == datetime(2026, 3, 1, 8, 30, tzinfo=UTC)

# Back out again: model_dump() -> dict, model_dump_json() -> str (datetimes become ISO 8601).
assert user.model_dump(include={"id", "role"}) == {"id": 42, "role": Role.ADMIN}
assert '"created_at":"2026-03-01T08:30:00Z"' in user.model_dump_json()
# endregion validate


# region errors
# Every problem is reported at once, each with a path to the offending field.
bad = {
    "id": "forty-two",
    "email": "nope",
    "name": "Eve",
    "address": {"city": "Berlin", "postcode": "1"},
    "created_at": "2026-03-01T09:30:00",
    "is_admin": True,
}
try:
    User.model_validate(bad)
except ValidationError as error:
    assert error.error_count() == 5
    for problem in error.errors():
        location = ".".join(str(part) for part in problem["loc"])
        print(f"  {location}: {problem['msg']}")
else:
    raise AssertionError("expected a ValidationError")
# endregion errors


# region strict-and-cross-field
class Booking(BaseModel):
    model_config = ConfigDict(strict=True)  # no coercion: "42" is NOT an int here

    nights: int
    check_in: datetime
    check_out: datetime

    @model_validator(mode="after")  # runs after the fields are valid: compare them
    def check_out_after_check_in(self) -> "Booking":
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self


def booking_errors(data: dict[str, object]) -> list[str]:
    try:
        Booking.model_validate(data)
    except ValidationError as error:
        return [problem["msg"] for problem in error.errors()]
    return []


jan1, jan2 = datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 1, 2, tzinfo=UTC)
assert booking_errors({"nights": "1", "check_in": jan1, "check_out": jan2}) == [
    "Input should be a valid integer"
]
# A field error stops validation before the model validator runs; once the fields are valid, it does:
assert booking_errors({"nights": 1, "check_in": jan2, "check_out": jan1}) == [
    "Value error, check_out must be after check_in"
]
assert booking_errors({"nights": 1, "check_in": jan1, "check_out": jan2}) == []
# endregion strict-and-cross-field
