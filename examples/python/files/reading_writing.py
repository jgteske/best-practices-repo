"""Reading and writing text, bytes, JSON and CSV - and cleaning up afterwards.

Run it: python3 reading_writing.py
"""

import csv
import json
import shutil
import tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())

# region text-and-bytes
notes = workdir / "notes.txt"
# Always pass encoding= for text. The default depends on the OS locale.
notes.write_text("café\nnaïve\n", encoding="utf-8")
assert notes.read_text(encoding="utf-8").splitlines() == ["café", "naïve"]

# Bytes are what is really on disk: "é" is two bytes in UTF-8.
raw = notes.read_bytes()
assert len(raw) == len("café\nnaïve\n") + 2
assert raw.startswith(b"caf\xc3\xa9")

# Large files: iterate line by line instead of reading everything into memory.
with notes.open(encoding="utf-8") as file:
    lengths = [len(line.rstrip("\n")) for line in file]
assert lengths == [4, 5]

# Modes: "w" truncates, "a" appends, "x" fails if the file already exists.
with notes.open("a", encoding="utf-8") as file:
    file.write("résumé\n")
try:
    notes.open("x", encoding="utf-8")
except FileExistsError:
    pass
else:
    raise AssertionError("mode 'x' must refuse an existing file")
# endregion text-and-bytes


# region json
settings = {"theme": "dark", "retries": 3, "tags": ["a", "b"]}
settings_file = workdir / "settings.json"
settings_file.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
assert json.loads(settings_file.read_text(encoding="utf-8")) == settings
# endregion json


# region csv
rows = [{"sku": "A-1", "qty": "3"}, {"sku": "B-2", "qty": "10"}]
stock = workdir / "stock.csv"
# newline="" is required by the csv module: it writes its own line endings.
with stock.open("w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=["sku", "qty"])
    writer.writeheader()
    writer.writerows(rows)

with stock.open(encoding="utf-8", newline="") as file:
    loaded = list(csv.DictReader(file))
assert loaded == rows  # note: every value comes back as a string
total = sum(int(row["qty"]) for row in loaded)
assert total == 13
# endregion csv


# region copy-and-clean
backup = workdir / "backup"
shutil.copytree(workdir, backup, ignore=shutil.ignore_patterns("backup"))
assert sorted(path.name for path in backup.iterdir()) == ["notes.txt", "settings.json", "stock.csv"]
shutil.make_archive(str(workdir / "bundle"), "zip", backup)  # writes bundle.zip
assert (workdir / "bundle.zip").stat().st_size > 0

shutil.rmtree(workdir)  # mkdtemp() leaves cleanup to you; TemporaryDirectory() does it for you
assert not workdir.exists()
# endregion copy-and-clean
