"""The domain logic: parsing and counting log lines. Nothing here knows about
argv, streams, environment variables or exit codes, so it is tested directly."""

import re
from dataclasses import dataclass, field
from typing import Literal

type Level = Literal["DEBUG", "INFO", "WARN", "ERROR"]
LEVELS: tuple[Level, ...] = ("DEBUG", "INFO", "WARN", "ERROR")  # ordered, lowest first


class CliError(Exception):
    """An expected failure: reported as one line on stderr, never a traceback."""

    exit_code = 1


class UsageError(CliError):
    exit_code = 2


# region parse
_LINE = re.compile(r"^(?P<timestamp>\S+)\s+(?P<level>[A-Z]+)\s+(?P<message>.*)$")


@dataclass(frozen=True, slots=True)
class Record:
    timestamp: str
    level: Level
    message: str


def parse_level(text: str) -> Level:
    upper = text.upper()
    for level in LEVELS:
        if level == upper:
            return level
    raise ValueError(f"unknown level {text!r} (expected one of {', '.join(LEVELS).lower()})")


def parse_line(line: str) -> Record | None:
    """A Record, or None when the line doesn't look like a log line."""
    match = _LINE.match(line.rstrip("\n"))
    if match is None:
        return None
    try:
        level = parse_level(match["level"])
    except ValueError:
        return None
    return Record(match["timestamp"], level, match["message"])


def at_least(level: Level, minimum: Level) -> bool:
    return LEVELS.index(level) >= LEVELS.index(minimum)


# endregion parse


# region stats
@dataclass(slots=True)
class Stats:
    levels: dict[Level, int] = field(default_factory=lambda: dict.fromkeys(LEVELS, 0))
    malformed: int = 0

    @property
    def total(self) -> int:
        return sum(self.levels.values())

    def add(self, record: Record) -> None:
        self.levels[record.level] += 1

    def as_json(self) -> dict[str, object]:
        return {"total": self.total, "levels": self.levels, "malformed": self.malformed}


# endregion stats
