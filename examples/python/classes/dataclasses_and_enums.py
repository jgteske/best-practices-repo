"""Dataclasses and enums: the two classes you should write most often.

Run it: python3 dataclasses_and_enums.py
"""

import dataclasses
from dataclasses import InitVar, dataclass, field
from datetime import date
from enum import Enum, IntFlag, StrEnum, auto


# region dataclass
# @dataclass writes __init__, __repr__ and __eq__ from the annotated fields.
@dataclass
class Task:
    title: str
    priority: int = 3
    tags: list[str] = field(default_factory=list)  # never `tags: list[str] = []`
    done: bool = False


task = Task("write docs", tags=["python"])
assert repr(task) == "Task(title='write docs', priority=3, tags=['python'], done=False)"
assert task == Task("write docs", 3, ["python"])  # compared field by field
# endregion dataclass


# region frozen
# frozen=True: immutable and hashable - a value object.
# slots=True: __slots__ for less memory and faster attribute access.
# kw_only=True: callers must name every field, so reordering fields is safe.
@dataclass(frozen=True, slots=True, kw_only=True)
class Coordinate:
    lat: float
    lon: float

    def __post_init__(self) -> None:  # validation hook, runs after __init__
        if not -90 <= self.lat <= 90:
            raise ValueError(f"latitude out of range: {self.lat}")


berlin = Coordinate(lat=52.52, lon=13.40)
# berlin.lat = 0  -> dataclasses.FrozenInstanceError: cannot assign to field 'lat'
moved = dataclasses.replace(berlin, lon=13.5)  # "modify" = copy with changes
assert moved.lon == 13.5 and berlin.lon == 13.40
assert len({berlin, Coordinate(lat=52.52, lon=13.40)}) == 1
assert dataclasses.asdict(berlin) == {"lat": 52.52, "lon": 13.40}
# endregion frozen


# region derived-fields
@dataclass
class Invoice:
    number: str
    net_cents: int
    vat_rate: InitVar[float]  # passed to __init__ and __post_init__, but not stored
    gross_cents: int = field(init=False)  # computed, not a constructor argument
    issued: date = field(default_factory=date.today, compare=False, repr=False)

    def __post_init__(self, vat_rate: float) -> None:
        self.gross_cents = round(self.net_cents * (1 + vat_rate))


invoice = Invoice("INV-1", 10_000, vat_rate=0.19)
assert invoice.gross_cents == 11_900
assert repr(invoice) == "Invoice(number='INV-1', net_cents=10000, gross_cents=11900)"
# endregion derived-fields


# region enums
class Status(StrEnum):  # members ARE strings: easy JSON, easy comparisons with input
    DRAFT = auto()  # auto() in a StrEnum -> the lower-cased member name
    PUBLISHED = auto()
    ARCHIVED = auto()


assert isinstance(Status.DRAFT, str)
assert f"status={Status.DRAFT}" == "status=draft"
assert Status("published") is Status.PUBLISHED  # parse; ValueError if unknown
assert [s.value for s in Status] == ["draft", "published", "archived"]


class Color(Enum):  # plain Enum: members are NOT equal to their values
    RED = 1
    GREEN = 2


assert not isinstance(Color.RED, int)  # so Color.RED == 1 is False
assert Color(1) is Color.RED
assert Color.RED.value == 1


class Permission(IntFlag):  # combinable bit flags
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()


rw = Permission.READ | Permission.WRITE
assert Permission.WRITE in rw
assert Permission.EXECUTE not in rw
# endregion enums

print("all dataclass/enum examples hold")
