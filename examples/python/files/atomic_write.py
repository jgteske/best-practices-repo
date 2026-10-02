"""Writing a file so readers never see it half-written.

Run it: python3 atomic_write.py
"""

import json
import os
import tempfile
from pathlib import Path
from typing import Any


# region atomic-write
def write_atomic(path: Path, text: str) -> None:
    """Replace `path` with `text` in one step: readers see the old or the new file, never a mix."""
    # The temporary file must be in the same directory: os.replace() is only
    # atomic within one filesystem.
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(text)
            file.flush()
            os.fsync(file.fileno())  # make sure the bytes are on disk before the rename
        os.replace(tmp_name, path)  # atomic on POSIX and Windows
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)  # never leave the temp file behind
        raise


# endregion atomic-write


# region usage
def save_state(path: Path, state: dict[str, Any]) -> None:
    write_atomic(path, json.dumps(state, indent=2) + "\n")


with tempfile.TemporaryDirectory() as tmp:
    state_file = Path(tmp) / "state.json"
    save_state(state_file, {"version": 1})
    save_state(state_file, {"version": 2})
    assert json.loads(state_file.read_text(encoding="utf-8")) == {"version": 2}

    # A failure halfway through leaves the previous version intact.
    try:
        save_state(state_file, {"version": 3, "bad": object()})
    except TypeError:
        pass
    else:
        raise AssertionError("object() is not JSON serializable")
    assert json.loads(state_file.read_text(encoding="utf-8")) == {"version": 2}
    assert [path.name for path in Path(tmp).iterdir()] == ["state.json"]  # no temp files left
# endregion usage
