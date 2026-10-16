"""Turning results into text: colour decisions, the human table, JSON, and the
diagnostics channel. Data goes to stdout; everything else goes to stderr."""

import json
from collections.abc import Mapping
from typing import TextIO

from logq.config import ColorMode
from logq.core import LEVELS, Level, Record, Stats


# region color
def use_color(mode: ColorMode, *, isatty: bool, env: Mapping[str, str]) -> bool:
    """An explicit --color always/never wins; `auto` follows the conventions."""
    if mode != "auto":
        return mode == "always"
    if env.get("NO_COLOR"):  # https://no-color.org: any non-empty value
        return False
    if env.get("FORCE_COLOR"):  # CI logs that render ANSI codes set this
        return True
    return isatty and env.get("TERM") != "dumb"


# endregion color

_STYLES: dict[Level, str] = {"DEBUG": "2", "INFO": "0", "WARN": "33", "ERROR": "1;31"}


def paint(text: str, level: Level, *, color: bool) -> str:
    return f"\x1b[{_STYLES[level]}m{text}\x1b[0m" if color else text


# region render
def render_table(stats: Stats, *, color: bool) -> str:
    rows = [(paint(f"{level:<5}", level, color=color), stats.levels[level]) for level in LEVELS]
    width = len(str(stats.total))
    lines = [f"{name}  {n:>{width}}" for name, n in rows]
    lines.append(f"{'total':<5}  {stats.total:>{width}}")
    if stats.malformed:
        lines.append(f"({stats.malformed} malformed line{'s' if stats.malformed != 1 else ''} skipped)")
    return "\n".join(lines) + "\n"


def render_json(value: object) -> str:
    # One compact document per line: easy for `jq`, and for the next program in a pipe.
    return json.dumps(value, separators=(",", ":")) + "\n"


def record_json(record: Record) -> dict[str, str]:
    return {"timestamp": record.timestamp, "level": record.level, "message": record.message}


# endregion render


# region diagnostics
class Diagnostics:
    """Messages for the human, on stderr: warnings unless -q, details only with -v."""

    def __init__(self, stream: TextIO, *, verbose: bool, quiet: bool) -> None:
        self._stream = stream
        self._verbose = verbose
        self._quiet = quiet

    def warn(self, message: str) -> None:
        if not self._quiet:
            print(f"logq: warning: {message}", file=self._stream)

    def detail(self, message: str) -> None:
        if self._verbose:
            print(f"logq: {message}", file=self._stream)

    def error(self, message: str) -> None:
        print(f"logq: error: {message}", file=self._stream)  # always shown, even with -q


# endregion diagnostics
