# TODO - Python: asyncio, logging, files & I/O

Workstream 1 of 4 (see ~/.claude/plans/look-at-the-repo-partitioned-lake.md).
Example folders are `concurrency/`, `logs/`, `files/` - not `asyncio/`, `logging/`, `io/`,
which would shadow the stdlib modules for mypy (explicit_package_bases).

## Examples (`examples/python/`)

- [x] `concurrency/asyncio_basics.py` - coroutines vs tasks, gather, async generators
- [x] `concurrency/task_groups.py` - TaskGroup, ExceptionGroup, cancellation
- [x] `concurrency/limits_and_timeouts.py` - timeout(), Semaphore, to_thread
- [x] `logs/library_logger.py` - getLogger(__name__), NullHandler, lazy formatting
- [x] `logs/app_config.py` - dictConfig, levels, logger.exception
- [x] `logs/structured.py` - JSON formatter, extra= context
- [x] `files/paths.py` - pathlib
- [x] `files/reading_writing.py` - encoding, text/binary, json/csv, tempfile, shutil
- [x] `files/atomic_write.py` - atomic replace

## Docs & wiring

- [x] `docs/python/asyncio.md`, `logging.md`, `files-and-io.md`
- [x] sidebar group "Standard Library in Practice" in config.ts
- [x] rows in `docs/python/index.md`, lines in `cheatsheet.md`, README

## Verification

- [x] `npm run check:python` with mypy + ruff + pytest installed
- [x] `npm run docs:build` (dead links)

## Review

Nine stdlib-only examples and three pages (`asyncio.md`, `logging.md`, `files-and-io.md`), in a new
"Standard Library in Practice" sidebar group. There are also index rows, cheatsheet sections and a README mention.

- The example folders are named `concurrency/`, `logs/` and `files/`. Folders named `asyncio/`, `logging/` and `io/`
  would shadow the stdlib modules under mypy's `explicit_package_bases`.
- `npm run check:python` (with mypy, ruff and pytest from a scratch venv): all 50 examples passed, 28 executed,
  and mypy --strict, ruff lint and format and pytest are all clean. No change to the script was needed.
- `npm run docs:build` passes, and every `<<<` region import rendered (11 / 9 / 9 snippets).
- Timing-based asserts are one-sided (`concurrent < sequential / 2`, gap `>= 0.1`), so a slow CI
  runner can't make them flaky.
