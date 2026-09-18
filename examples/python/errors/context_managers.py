"""`with` statements: guaranteed cleanup, written three ways.

Run it: python3 context_managers.py
"""

import contextlib
import os
import tempfile
import time
from collections.abc import Iterator
from pathlib import Path
from types import TracebackType
from typing import Self

# region with-files
# `with` guarantees cleanup even when the block raises. Files are the classic case.
with tempfile.TemporaryDirectory() as tmp:
    path = Path(tmp) / "notes.txt"
    with path.open("w", encoding="utf-8") as handle:  # always pass an encoding
        handle.write("first line\n")
    assert handle.closed  # closed the moment the block ended

    # pathlib has one-shot helpers that open and close for you:
    path.write_text("replaced\n", encoding="utf-8")
    assert path.read_text(encoding="utf-8") == "replaced\n"
# the whole directory is gone here
# endregion with-files


# region class-based
# The protocol: __enter__ runs at the start, __exit__ at the end - always.
class Timer:
    def __enter__(self) -> Self:
        self.start = time.perf_counter()
        return self  # this is what `as` binds

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:  # return True to SUPPRESS the exception; None/False re-raises it
        self.elapsed = time.perf_counter() - self.start


with Timer() as timer:
    sum(range(100_000))
assert timer.elapsed > 0
# endregion class-based


# region generator-based
# @contextmanager: code before `yield` is __enter__, code after is __exit__.
# The try/finally is what makes the cleanup unconditional.
@contextlib.contextmanager
def env_var(name: str, value: str) -> Iterator[None]:
    old = os.environ.get(name)
    os.environ[name] = value
    try:
        yield
    finally:
        if old is None:
            del os.environ[name]
        else:
            os.environ[name] = old


with env_var("APP_MODE", "test"):
    assert os.environ["APP_MODE"] == "test"
assert "APP_MODE" not in os.environ
# endregion generator-based


# region contextlib-helpers
# suppress: ignore one specific exception.
with contextlib.suppress(FileNotFoundError):
    Path("/definitely/not/here").unlink()

# ExitStack: a dynamic number of context managers, all cleaned up in reverse order.
with tempfile.TemporaryDirectory() as tmp, contextlib.ExitStack() as stack:
    names = ["a.txt", "b.txt", "c.txt"]
    handles = [stack.enter_context((Path(tmp) / name).open("w", encoding="utf-8")) for name in names]
    for handle in handles:
        handle.write("x")
    stack.callback(print, "  ExitStack closed", len(handles), "files")
assert all(handle.closed for handle in handles)
# endregion contextlib-helpers

print("all context manager examples hold")
