"""Where each setting comes from: defaults < config file < environment < flags.

`resolve_settings` is a pure function of its inputs - it never reads os.environ
or the filesystem itself - so every precedence rule is a one-line test."""

import tomllib
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from logq.core import CliError, Level, parse_level

type ColorMode = Literal["auto", "always", "never"]
COLOR_MODES: tuple[ColorMode, ...] = ("auto", "always", "never")


# region settings
@dataclass(frozen=True, slots=True)
class Setting[T]:
    value: T
    source: str  # "default", "LOGQ_MIN_LEVEL", "--color", "/home/me/.config/logq/config.toml"


@dataclass(frozen=True, slots=True)
class Settings:
    min_level: Setting[Level]
    color: Setting[ColorMode]


def parse_color(text: str) -> ColorMode:
    for mode in COLOR_MODES:
        if mode == text.lower():
            return mode
    raise ValueError(f"unknown color mode {text!r} (expected one of {', '.join(COLOR_MODES)})")


# Each layer maps a setting name to a raw string, lowest precedence first.
type Layer = tuple[str, Mapping[str, str]]

ENV_NAMES = {"min_level": "LOGQ_MIN_LEVEL", "color": "LOGQ_COLOR"}


def resolve_settings(
    *, flags: Mapping[str, str | None], env: Mapping[str, str], file: Layer | None
) -> Settings:
    raw: dict[str, tuple[str, str]] = {"min_level": ("INFO", "default"), "color": ("auto", "default")}

    layers: list[Layer] = []
    if file is not None:
        layers.append(file)
    for name, variable in ENV_NAMES.items():
        if env.get(variable):  # an empty variable counts as unset
            layers.append((variable, {name: env[variable]}))
    for name, value in flags.items():
        if value is not None:
            layers.append((f"--{name.replace('_', '-')}", {name: value}))

    for source, values in layers:  # later layers win
        for name, value in values.items():
            raw[name] = (value, source)

    # Validate after merging, so the error names the layer the bad value came from.
    def pick[T](name: str, parse: Callable[[str], T]) -> Setting[T]:
        text, source = raw[name]
        try:
            return Setting(parse(text), source)
        except ValueError as error:
            raise CliError(f"{error} (from {source})") from None

    return Settings(min_level=pick("min_level", parse_level), color=pick("color", parse_color))


# endregion settings


# region config-file
def config_path(flag: str | None, env: Mapping[str, str]) -> Path | None:
    """--config, then $LOGQ_CONFIG, then the XDG location if that file exists."""
    if flag:
        return Path(flag)
    if env.get("LOGQ_CONFIG"):
        return Path(env["LOGQ_CONFIG"])
    base = env.get("XDG_CONFIG_HOME") or (f"{env['HOME']}/.config" if env.get("HOME") else None)
    if base is None:
        return None
    default = Path(base) / "logq" / "config.toml"
    return default if default.is_file() else None


def load_config_file(path: Path) -> Layer:
    try:
        with path.open("rb") as file:  # tomllib wants bytes
            data = tomllib.load(file)
    except FileNotFoundError:
        raise CliError(f"config file not found: {path}") from None
    except tomllib.TOMLDecodeError as error:
        raise CliError(f"{path}: invalid TOML: {error}") from None

    values: dict[str, str] = {}
    for key, value in data.items():
        if key not in ENV_NAMES:
            raise CliError(f"{path}: unknown setting {key!r}")
        if not isinstance(value, str):
            raise CliError(f"{path}: {key} must be a string")
        values[key] = value
    return (str(path), values)


# endregion config-file
