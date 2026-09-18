"""Raising, catching, chaining and grouping exceptions.

Run it: python3 exceptions.py
"""

import json
import traceback


# region custom-errors
# One base class per library/app, so callers can catch "anything from us"
# without also swallowing bugs like TypeError or KeyError.
class AppError(Exception):
    """Base class for every error this application raises on purpose."""


class ConfigError(AppError):
    def __init__(self, key: str, reason: str) -> None:
        super().__init__(f"config key {key!r}: {reason}")
        self.key = key  # structured data for handlers, not just a message


class NotFoundError(AppError):
    pass


# endregion custom-errors


# region try-structure
def read_port(raw_config: str) -> int:
    try:
        config = json.loads(raw_config)
        port = int(config["port"])
    except json.JSONDecodeError as error:
        # `from error` keeps the original as __cause__: both tracebacks are shown.
        raise ConfigError("port", "config is not valid JSON") from error
    except KeyError:
        raise ConfigError("port", "missing") from None  # hide an irrelevant cause
    except (TypeError, ValueError) as error:
        raise ConfigError("port", f"not an integer ({error})") from error
    else:
        # Runs only if the try block raised nothing. Keeps the try block minimal.
        if not 0 < port < 65536:
            raise ConfigError("port", f"out of range: {port}")
        return port
    finally:
        # Always runs - success, exception, or return. Cleanup goes here.
        pass


assert read_port('{"port": "8080"}') == 8080
for bad in ["{", "{}", '{"port": "http"}', '{"port": 70000}']:
    try:
        read_port(bad)
    except ConfigError as error:
        cause = type(error.__cause__).__name__ if error.__cause__ else None
        print(f"  {bad:20} -> {error}  (cause: {cause})")
# endregion try-structure


# region eafp
# EAFP ("easier to ask forgiveness than permission") is idiomatic Python:
# try the operation and handle the failure, instead of checking first.
settings = {"theme": "dark"}

# LBYL - two lookups, and racy for files/network resources:
theme = settings["theme"] if "theme" in settings else "light"  # noqa: SIM401

# EAFP:
try:
    theme = settings["theme"]
except KeyError:
    theme = "light"

# ...and for the common cases, an API that does not raise at all:
theme = settings.get("theme", "light")
assert theme == "dark"
# endregion eafp


# region catch-narrowly
def parse_age(raw: str) -> int | None:
    try:
        return int(raw)
    except ValueError:  # catch exactly what you expect...
        return None
    # ...never a bare `except:` - it also catches KeyboardInterrupt and SystemExit,
    # and `except Exception:` hides your own bugs unless you log and re-raise.


assert parse_age("42") == 42
assert parse_age("forty") is None
# endregion catch-narrowly


# region notes-and-groups
# add_note (3.11+) attaches context without changing the exception type.
try:
    try:
        int("x")
    except ValueError as error:
        error.add_note("while parsing row 17 of users.csv")
        raise
except ValueError as error:
    assert error.__notes__ == ["while parsing row 17 of users.csv"]


# ExceptionGroup + except* (3.11+): several independent failures at once,
# e.g. from concurrent tasks or validating every field of a form.
def validate(user: dict[str, str]) -> None:
    problems: list[Exception] = []
    if "@" not in user.get("email", ""):
        problems.append(ValueError("email is invalid"))
    if not user.get("name"):
        problems.append(KeyError("name"))
    if problems:
        raise ExceptionGroup("invalid user", problems)


try:
    validate({"email": "nope"})
except* ValueError as group:  # handles every ValueError in the group
    print(f"  value errors: {[str(e) for e in group.exceptions]}")
except* KeyError as group:  # ...and, independently, every KeyError
    print(f"  missing keys: {[str(e) for e in group.exceptions]}")
# endregion notes-and-groups


# region traceback
# At the top level of a program, log the full traceback, then exit non-zero.
def main() -> int:
    try:
        raise NotFoundError("user 7")
    except AppError:
        text = traceback.format_exc()
        assert text.splitlines()[-1] == "NotFoundError: user 7"
        return 1


assert main() == 1
# endregion traceback

print("all exception examples hold")
