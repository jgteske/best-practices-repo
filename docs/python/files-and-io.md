# Files, Paths & I/O

Reading and writing files looks trivial, and most file bugs are small: a
path built by string concatenation, a missing `encoding=`, a CSV with blank
lines on Windows, or a config file left half-written after a crash. This page covers
the standard-library way to avoid each of them.

Examples: [`examples/python/files`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/files).

## Paths are objects: `pathlib`

<<< ../../examples/python/files/paths.py#path-parts

`pathlib.Path` replaces almost all of `os.path`. You join with `/` and read
the parts as attributes (`.name`, `.stem`, `.suffix`, `.parent`). It also uses the right
separator on every OS. `PurePosixPath` is used above only so the example gives
the same result everywhere. In real code, use `Path`.

### Relative to what?

<<< ../../examples/python/files/paths.py#relative-to-script

A relative path like `Path("data.csv")` is resolved against the **current
working directory**, which is wherever the user ran the program from. To find
files that ship *next to your code*, start from `Path(__file__).resolve().parent`.
Inside an installed package, use `importlib.resources.files(__package__)` instead.

### Touching the filesystem

<<< ../../examples/python/files/paths.py#filesystem

```
  remaining: ['a.old', 'b.log']
```

| Task | `pathlib` |
| --- | --- |
| create a directory tree | `path.mkdir(parents=True, exist_ok=True)` |
| list / search | `iterdir()`, `glob("*.log")`, `rglob("*.log")` |
| test | `exists()`, `is_file()`, `is_dir()` |
| size / mtime | `stat().st_size`, `stat().st_mtime` |
| rename / delete | `rename()`, `replace()`, `unlink(missing_ok=True)`, `rmdir()` |
| read / write everything | `read_text()`, `write_text()`, `read_bytes()`, `write_bytes()` |

## Text, bytes and encodings

<<< ../../examples/python/files/reading_writing.py#text-and-bytes

- **Always pass `encoding="utf-8"`** in text mode. The default comes from the OS
  locale, which is often not UTF-8 on Windows. The same code then reads the same file
  differently on different machines. Ruff's `PLW1514` rule flags missing encodings.
- Text mode (`"r"`, `"w"`) decodes to and from `str`. Binary mode (`"rb"`, `"wb"`) gives
  you `bytes`, which you need for images, archives and hashing.
- Iterate over the open file to process large files **line by line** in
  constant memory. `read_text()` loads everything at once.
- `"x"` mode creates the file and fails if it already exists. That's a race-free
  "don't overwrite".

## JSON and CSV

<<< ../../examples/python/files/reading_writing.py#json

<<< ../../examples/python/files/reading_writing.py#csv

Open CSV files with **`newline=""`**. The `csv` module writes its own `\r\n`
line endings, and without `newline=""` text mode translates them again, which
gives blank lines between rows on Windows. Everything `csv` reads comes back as a
string, so convert the types yourself, or validate the rows into a dataclass.

## Copying, archiving, cleaning up

<<< ../../examples/python/files/reading_writing.py#copy-and-clean

`shutil` has the higher-level operations: `copy2` (which keeps metadata),
`copytree`, `move`, `rmtree`, `make_archive` and `disk_usage`. For scratch space, use
`tempfile.TemporaryDirectory()` as a context manager. It deletes itself even if
the block raises. `mkdtemp()` leaves the cleanup to you.

## Writing a file atomically

A program that crashes mid-`write_text()` leaves a truncated file behind, and
a reader that opens the file mid-write sees half of it. For config, state and
cache files, write a temporary file next to the target and swap it in:

<<< ../../examples/python/files/atomic_write.py#atomic-write

<<< ../../examples/python/files/atomic_write.py#usage

`os.replace()` swaps the name over in one step. A reader sees either the complete
old file or the complete new one. This only works **within one filesystem**,
which is why the temporary file goes in the target's own directory and not in
`/tmp`. `fsync` makes sure the new contents have actually reached the disk before the rename,
so a power cut can't leave a renamed but empty file.

## Summary

- Build paths with `pathlib` and `/`. Find bundled files from `__file__`, not the working directory.
- Always pass `encoding="utf-8"`. Open CSV files with `newline=""`.
- Stream large files line by line. Use `TemporaryDirectory()` for scratch space.
- Replace important files atomically: temp file in the same directory, `fsync`, `os.replace`.
