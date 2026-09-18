# Command-Line Apps

A good CLI follows the conventions every Unix tool follows. It prints `--help`,
reads stdin when given no arguments, writes results to stdout and problems to
stderr, and reports success or failure through its exit code. This page builds
one with `argparse` from the standard library, installs it as a real command,
and tests it. The example is `slugkit`'s CLI:
[`src/slugkit/cli.py`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/projects/slugkit/src/slugkit/cli.py).

## The whole CLI

<<< ../../examples/python/projects/slugkit/src/slugkit/cli.py#cli

The structure is worth copying as it stands:

- **`build_parser()`** only describes the interface, and **`main(argv)`** only
  runs it. Keeping them apart makes the parser reusable, for docs generation or
  shell completion.
- **`main` takes `argv` and returns an exit code.** It never calls `sys.exit`
  itself, so tests can call `main(["slug", "x"])` directly, without a subprocess.
- **The CLI is a thin layer.** Parsing and printing happen here, and the logic
  lives in `slugkit.core` as pure functions, testable without any CLI at all.

## What argparse gives you for free

```
$ slugkit --help
usage: slugkit [-h] [--version] {slug,dedupe} ...

Turn titles into URL slugs.

positional arguments:
  {slug,dedupe}
    slug         slugify each title (or each line of stdin)
    dedupe       slugify titles, making repeats unique

options:
  -h, --help     show this help message and exit
  --version      show program's version number and exit

$ slugkit slug --help
usage: slugkit slug [-h] [-s SEPARATOR] [-m N] [titles ...]

positional arguments:
  titles                titles to convert; reads stdin when omitted

options:
  -h, --help            show this help message and exit
  -s, --separator SEPARATOR
                        word separator (default: -)
  -m, --max-length N    truncate slugs to N chars

$ slugkit --version
slugkit 0.3.0
```

| `add_argument(...)` | Gives you |
| --- | --- |
| `"titles", nargs="*"` | zero or more positionals (`"+"` means one or more, `"?"` means optional) |
| `"-s", "--separator", default="-"` | an option with a short and a long form. `%(default)s` in `help` shows the default |
| `type=int` | conversion *and* a clear error when conversion fails |
| `choices=["json", "csv"]` | validation, listed in the help text |
| `action="store_true"` | a boolean flag (`--verbose`) |
| `action="append"` | a repeatable option (`-t a -t b`) |
| `metavar="N"` | the placeholder name shown in help |
| `add_subparsers(dest=..., required=True)` | `git`-style subcommands |

## Behaving like a Unix tool

```
$ slugkit slug "Hello, World!" "Crème brûlée"
hello-world
creme-brulee

$ printf 'First post\nSecond post\n' | slugkit slug -s _
first_post
second_post

$ slugkit dedupe Post Post Post
post
post-2
post-3
```

Reading stdin when no arguments are given lets the tool sit in a pipeline:
`cat titles.txt | slugkit slug | sort | uniq -c`. Results go to stdout, one per
line, with nothing else mixed in, so the next program in the pipe can consume
them.

### Errors and exit codes

```
$ slugkit slug '???'
slugkit: error: nothing to slugify in '???'
$ echo $?
1

$ slugkit slug --max-length many
usage: slugkit slug [-h] [-s SEPARATOR] [-m N] [titles ...]
slugkit slug: error: argument -m/--max-length: invalid int value: 'many'
$ echo $?
2

$ slugkit
usage: slugkit [-h] [--version] {slug,dedupe} ...
slugkit: error: the following arguments are required: command
$ echo $?
2
```

| Exit code | Meaning |
| --- | --- |
| `0` | success |
| `1` | the command ran but failed: bad data, a file not found, a failed request |
| `2` | wrong usage. argparse uses this automatically for invalid arguments |
| `130` | interrupted with Ctrl-C (128 + SIGINT). Python's default for `KeyboardInterrupt` |

Error messages go to **stderr** (`print(..., file=sys.stderr)`). A script
running `slugkit ... > out.txt` still sees them, and `out.txt` doesn't get an
error message where data should be. Catch *expected* errors (`SlugError`) and
turn them into a one-line message and exit code 1. Let unexpected ones raise, so
the traceback shows the bug.

## Installing it as a command

The CLI becomes a command through one table in `pyproject.toml`:

```toml
[project.scripts]
slugkit = "slugkit.cli:main"      # command name = "module.path:function"
```

On install, pip or Poetry generates a small launcher in the venv's `bin/`
(`Scripts\slugkit.exe` on Windows):

```
$ cat .venv/bin/slugkit
#!/path/to/slugkit/.venv/bin/python
import sys
from slugkit.cli import main

if __name__ == '__main__':
    sys.exit(main())
```

The launcher calls `sys.exit(main())`, which is why `main` *returns* the exit
code. The command is available as `poetry run slugkit` in the project, or as
plain `slugkit` once the venv is active or the package is installed for a user
with `pipx install slugkit`.

For GUI programs that shouldn't open a console window on Windows, use
`[project.gui-scripts]` instead. [Standalone Executables](./standalone-executables)
covers shipping a program to people who don't have Python at all.

### `python -m slugkit` as well

<<< ../../examples/python/projects/slugkit/src/slugkit/__main__.py

`python -m slugkit` always uses the *current* interpreter, which helps when
several Python versions or venvs are involved, and it works even when the
venv's `bin/` isn't on `PATH`.

## Testing the CLI

<<< ../../examples/python/projects/slugkit/tests/test_cli.py#test-cli

Because `main` accepts `argv`, most tests call it directly and use pytest's
`capsys` to capture stdout and stderr. That's fast, and failures show up as
normal assertion errors. One end-to-end test through a subprocess
(`python -m slugkit`) then proves the wiring works. argparse signals usage
errors by raising `SystemExit(2)`, and `pytest.raises` catches it.

## Beyond argparse

argparse is in the standard library and covers most tools. Two libraries are
worth knowing when the CLI grows:

| | [Click](https://click.palletsprojects.com/) | [Typer](https://typer.tiangolo.com/) |
| --- | --- | --- |
| Style | decorators describe options | function parameters and type hints *are* the options |
| Brings | nested command groups, prompts, colours, file arguments, a test runner | everything Click has (it's built on Click), plus less boilerplate |
| Pick it for | large, nested CLIs | typed code, the fastest route from function to command |

Adding either is one `poetry add`. The rest of this page still applies: a thin
CLI layer, `main()` returning an exit code, stdout for data, stderr for
errors, and a `[project.scripts]` entry.

## Checklist

- `main(argv: Sequence[str] | None = None) -> int`, called by
  `sys.exit(main())`.
- Logic lives in importable, pure functions, and the CLI only parses and
  prints.
- Data goes to stdout, messages to stderr. Exit 0 on success, 1 on failure, 2
  for usage errors.
- Reads stdin when it makes sense, so the tool composes in pipelines.
- It's installed through `[project.scripts]`, never as `python path/to/cli.py`.
- Tests call `main([...])` with `capsys`, plus one subprocess test.
