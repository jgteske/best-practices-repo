"""pathlib: paths as objects instead of strings.

Run it: python3 paths.py
"""

import tempfile
from pathlib import Path, PurePosixPath

# region path-parts
report = PurePosixPath("/srv/data/reports/2026-q3.final.csv")
assert report.name == "2026-q3.final.csv"
assert report.stem == "2026-q3.final"
assert report.suffix == ".csv"
assert report.suffixes == [".final", ".csv"]
assert report.parent == PurePosixPath("/srv/data/reports")
assert report.parts[:3] == ("/", "srv", "data")

# `/` joins segments with the right separator for the OS - no string concatenation.
assert PurePosixPath("/srv") / "data" / "x.csv" == PurePosixPath("/srv/data/x.csv")
assert report.with_suffix(".json").name == "2026-q3.final.json"
assert report.with_stem("2026-q4").name == "2026-q4.csv"
assert report.relative_to("/srv/data") == PurePosixPath("reports/2026-q3.final.csv")
# endregion path-parts


# region relative-to-script
# Paths relative to *this file*, not to wherever the user ran the command from.
HERE = Path(__file__).resolve().parent
assert (HERE / "paths.py").is_file()
# Path("config.toml") alone is relative to the current working directory, which
# changes depending on how the program is started.
# endregion relative-to-script


# region filesystem
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "logs" / "2026").mkdir(parents=True, exist_ok=True)  # like `mkdir -p`
    for name in ("a.log", "b.log", "notes.txt"):
        (root / "logs" / "2026" / name).write_text(f"{name}\n", encoding="utf-8")

    # glob() matches in one directory; rglob() (or "**/") recurses.
    logs = sorted(path.name for path in root.rglob("*.log"))
    assert logs == ["a.log", "b.log"]

    target = root / "logs" / "2026" / "a.log"
    assert target.exists() and target.stat().st_size == len("a.log\n")
    target.rename(target.with_suffix(".old"))  # returns the new Path
    assert not target.exists()

    (root / "logs" / "2026" / "notes.txt").unlink()
    (root / "missing.txt").unlink(missing_ok=True)  # no error if it is not there
    print(f"  remaining: {sorted(p.name for p in (root / 'logs' / '2026').iterdir())}")
# endregion filesystem
