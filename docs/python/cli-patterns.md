# CLI Patterns: Config, Output & Signals

[Command-Line Apps](./cli-apps) covers the basics: `argparse`, a `main(argv)`
that returns an exit code, stdout for data and stderr for errors. This page
covers what a CLI needs once other people and other programs depend on it:

- settings that come from flags, environment variables *and* a config file, in a predictable order
- a `--json` mode for scripts, and colour only when a human is watching
- `-v` and `-q`
- input streamed instead of loaded into memory
- a clean exit on Ctrl-C and on `| head`
- I/O passed in as arguments, so all of it can be tested

The example is `logq`, a small tool that summarizes and filters log files:
[`examples/python/cli`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/cli).
The [Node & TypeScript guide](../javascript/building-clis) builds the **same
tool, flag for flag**, so you can compare the two languages decision by decision.

## What it does

```
$ logq stats sample.log
logq: warning: sample.log:5: skipping malformed line
DEBUG  1
INFO   3
WARN   1
ERROR  1
total  6
(1 malformed line skipped)

$ logq filter --min-level warn sample.log 2>/dev/null
2026-10-16T09:03:40Z WARN  disk 91% full
2026-10-16T09:04:05Z ERROR upload failed: connection reset

$ logq filter -q --json -l error sample.log | jq -r .message
upload failed: connection reset

$ LOGQ_MIN_LEVEL=warn logq filter -v sample.log > /dev/null
logq: min_level=WARN (from LOGQ_MIN_LEVEL)
logq: color=auto (from default)
logq: warning: sample.log:5: skipping malformed line
```

The warning goes to **stderr**, so `2>/dev/null` hides it and the data stays
clean. `--json` gives `jq` one document per line. `-v` shows where each
setting came from.

## The layout

```
examples/python/cli/
├── logq/
│   ├── core.py       # parsing and counting - pure, knows nothing about the CLI
│   ├── config.py     # which value wins: defaults < file < env < flags
│   ├── output.py     # colour rules, table and JSON rendering, diagnostics
│   ├── cli.py        # argv -> settings -> command -> exit code
│   └── __main__.py   # python -m logq
├── sample.log
└── test_logq.py
```

Each layer only depends on the ones above it in this list. `core` can be
reused by a web service or a notebook, and `cli` is the only module that knows
about argv and exit codes.

## Settings: one precedence order, everywhere

Users expect the same order from every tool. From lowest to highest priority:

1. **Built-in defaults**
2. **A config file**, for per-user or per-project preferences
3. **Environment variables**, for per-shell or per-CI-job overrides
4. **Command-line flags**, for this one run

The more specific and short-lived the source, the higher it ranks.
`resolve_settings` implements the order as a list of layers where later
layers win. It takes everything as arguments and never reads `os.environ` or
the filesystem itself:

<<< ../../examples/python/cli/logq/config.py#settings

Each value keeps track of its **source**, which pays off twice. `-v` can
explain *why* a setting has the value it has, and a bad value is reported
together with where it came from:

```
$ LOGQ_COLOR=loud logq stats sample.log
logq: error: unknown color mode 'loud' (expected one of auto, always, never) (from LOGQ_COLOR)
```

An empty variable counts as unset, so `LOGQ_COLOR= logq ...` falls back to
the next layer instead of failing.

### Finding the config file

<<< ../../examples/python/cli/logq/config.py#config-file

An explicit `--config` path must exist. The default XDG location
(`~/.config/logq/config.toml`) is optional, so a missing file there is not an
error. `tomllib` has been in the standard library since 3.11, and TOML is what
Python users expect from `pyproject.toml`. Unknown keys are rejected, so a typo
like `min_levl` doesn't get silently ignored.

## Output: stdout is for data

<<< ../../examples/python/cli/logq/output.py#diagnostics

Every message meant for a human goes through one object, which writes to
**stderr** and applies `-v` and `-q` in a single place. Data is the only thing
written to stdout. That is why `logq filter app.log > errors.log` produces a
clean file while warnings still appear on the terminal.

| Flag | Shows |
| --- | --- |
| *(none)* | data, plus warnings and errors |
| `-q` | data and errors only |
| `-v` | data, plus warnings, errors and details such as where each setting came from |

`argparse` makes `-v` and `-q` mutually exclusive with
`add_mutually_exclusive_group()`. For larger apps, route the same levels through
[`logging`](./logging) instead of a hand-written class.

### `--json` for machines

<<< ../../examples/python/cli/logq/output.py#render

The human table can change between versions. `--json` is the stable interface
for scripts. Write **one compact document per line** (JSON Lines). `filter
--json` emits a document per match, so a consumer can process matches as they
arrive and doesn't have to wait for one big array.

### Colour only for humans

<<< ../../examples/python/cli/logq/output.py#color

`--color auto` is the default, and the order of checks matters:

1. An explicit `--color always` or `never` always wins.
2. [`NO_COLOR`](https://no-color.org) set to anything non-empty turns colour off.
3. `FORCE_COLOR` turns it on, for CI logs that render ANSI codes.
4. Otherwise colour is used only when **stdout is a terminal** (`isatty()`) and
   `TERM` isn't `dumb`.

Rule 4 is the important one. Escape codes written into a file or a pipe are
garbage to the next program.

## Streaming input

<<< ../../examples/python/cli/logq/cli.py#io

`read_lines` is a generator, so memory use stays the same for a 10 KB file
and a 10 GB one, and `filter` writes each match as soon as it finds it. `-` or
no file means stdin, so `logq` works in the middle of a pipeline:
`zcat app.log.gz | logq filter -l error`. Opening with `errors="replace"` means
one bad byte in a log can't crash the run.

## `main`: argv in, exit code out

<<< ../../examples/python/cli/logq/cli.py#main

`main` takes **every** outside dependency as a parameter: argv, the three
streams and the environment. The defaults are the real ones, so production
code calls `main()` and tests pass fakes. `CliError` is the only exception it
turns into a message. Anything else is a bug and should show its traceback.

| Exit code | Meaning | logq example |
| --- | --- | --- |
| `0` | success | |
| `1` | it ran and failed | missing file, `--strict` and a malformed line, a bad config value |
| `2` | wrong usage | unknown flag, `--min-level loud`, no command |
| `130` | interrupted by Ctrl-C | 128 + SIGINT |
| `141` | the reader closed the pipe | `logq filter big.log \| head -1` (128 + SIGPIPE) |

## Ctrl-C and broken pipes

Python's defaults are wrong for a CLI in two places. Both show the user a
traceback, or a failure exit code, for something that isn't a bug. Without the
handler below:

```
$ logq filter big.log | head -1          # head exits after one line
2026 INFO line 1
Traceback (most recent call last):
  ...
BrokenPipeError: [Errno 32] Broken pipe
$ echo ${PIPESTATUS[0]}
1

$ logq stats app.log | true              # the reader never reads at all
Exception ignored on flushing sys.stdout:
BrokenPipeError: [Errno 32] Broken pipe
$ echo ${PIPESTATUS[0]}
120
```

Python ignores `SIGPIPE`, so a write to a closed pipe raises `BrokenPipeError`
instead of quietly ending the process the way it ends `grep` or `cat`. When
the output is small, the error can't surface while your code is running. The
text sits in stdout's buffer until the interpreter flushes it at exit, after
`main` has returned and no `except` of yours can catch it. Ctrl-C raises
`KeyboardInterrupt` and prints a traceback too. The installed entry point
handles all three:

<<< ../../examples/python/cli/logq/cli.py#entry

- **The explicit `sys.stdout.flush()`** pulls the exit-time error forward into
  the `try`, so `| true` gets the same clean 141 as `| head`.
- **The `os.dup2` line** is the fix the
  [Python docs recommend](https://docs.python.org/3/library/signal.html#note-on-sigpipe).
  After a failed write the data is *still buffered*, and Python tries to
  flush it again at exit. Pointing stdout at `/dev/null` lets that retry
  succeed silently. Without it, the `| true` test fails.

Both handlers live in `entry`, not `main`. Tests call `main` with a
`StringIO`, which never breaks, and there's no Ctrl-C to catch in a test
function.

::: warning Point `[project.scripts]` at `entry`
```toml
[project.scripts]
logq = "logq.cli:entry"     # not logq.cli:main
```
`__main__.py` does the same with `sys.exit(entry())`, so `python -m logq` and
the installed command behave the same way.
:::

## Testing

Most tests call `main` in the same process. A tiny helper fills in fake
streams and an **empty environment**, so a developer's own `LOGQ_*` variables
or `~/.config/logq` can never change a test's result:

<<< ../../examples/python/cli/test_logq.py#test-precedence

Precedence is a table, so `parametrize` it, one row per rule. The config-file
test sets `XDG_CONFIG_HOME` to `tmp_path`, which works because `config_path`
reads the injected environment and not the real one.

<<< ../../examples/python/cli/test_logq.py#test-output

`FakeTty` is a `StringIO` whose `isatty()` returns `True`. That one class is
enough to test the colour rules without a real terminal.

<<< ../../examples/python/cli/test_logq.py#test-errors

Pipes and signals happen at the process level, so those tests run the real
`python -m logq`:

<<< ../../examples/python/cli/test_logq.py#test-process

The SIGINT test waits for `-v`'s first line on stderr before sending the
signal. Sending it any earlier would race with interpreter startup.

## Checklist

- Precedence: **defaults < config file < env < flags**. Keep track of each
  value's source, and name it in errors and in `-v` output.
- Data on **stdout**, everything else on **stderr**, through one diagnostics
  object that applies `-q` and `-v`.
- `--json` as the stable machine interface, one document per line.
- Colour: explicit flag > `NO_COLOR` > `FORCE_COLOR` > `isatty()`.
- Stream input with generators, and treat `-` or no file as stdin.
- `main(argv, stdin=, stdout=, stderr=, env=) -> int`, with tests passing fakes
  and an empty environment.
- `entry()` handles `KeyboardInterrupt` (130) and `BrokenPipeError` (141), and
  `[project.scripts]` points at it.
