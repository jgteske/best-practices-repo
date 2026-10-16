"""The command-line layer: parse argv, resolve settings, run a command, map the
outcome to an exit code. All I/O is passed in, so tests never touch the real
terminal, environment or home directory."""

import argparse
import os
import sys
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from typing import TextIO

from logq import __version__
from logq.config import COLOR_MODES, Settings, config_path, load_config_file, resolve_settings
from logq.core import LEVELS, CliError, Record, Stats, at_least, parse_line
from logq.output import Diagnostics, record_json, render_json, render_table, use_color


# region parser
def build_parser() -> argparse.ArgumentParser:
    # Options every subcommand accepts. Attaching them to each subparser (rather
    # than the top-level parser) lets users write `logq stats --json`, which is
    # where people put them.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("files", nargs="*", metavar="FILE", help="log files; '-' or none reads stdin")
    common.add_argument("--json", action="store_true", help="machine-readable output")
    common.add_argument("--color", choices=COLOR_MODES, help="colour output (default: auto)")
    common.add_argument("--config", metavar="PATH", help="config file (default: $LOGQ_CONFIG, then XDG)")
    common.add_argument("--strict", action="store_true", help="treat a malformed line as an error")
    noise = common.add_mutually_exclusive_group()
    noise.add_argument("-v", "--verbose", action="store_true", help="explain what is happening, on stderr")
    noise.add_argument("-q", "--quiet", action="store_true", help="only report errors")

    parser = argparse.ArgumentParser(prog="logq", description="Summarize and filter log files.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    commands = parser.add_subparsers(dest="command", required=True, metavar="COMMAND")
    commands.add_parser("stats", parents=[common], help="count lines per level")
    filter_ = commands.add_parser("filter", parents=[common], help="print lines at or above a level")
    filter_.add_argument(
        "-l", "--min-level", type=str.upper, choices=LEVELS, help="lowest level to keep (default: INFO)"
    )
    return parser


# endregion parser


# region io
@dataclass(frozen=True, slots=True)
class Io:
    stdin: TextIO
    stdout: TextIO
    stderr: TextIO
    env: Mapping[str, str]


def read_lines(files: Sequence[str], io: Io) -> Iterator[tuple[str, int, str]]:
    """Yield (source, line number, line) lazily: a 10 GB log never sits in memory."""
    for name in files or ["-"]:
        if name == "-":
            yield from (("<stdin>", n, line) for n, line in enumerate(io.stdin, 1))
            continue
        try:
            with open(name, encoding="utf-8", errors="replace") as file:
                yield from ((name, n, line) for n, line in enumerate(file, 1))
        except FileNotFoundError:
            raise CliError(f"{name}: no such file") from None
        except IsADirectoryError:
            raise CliError(f"{name}: is a directory") from None


def records(
    args: argparse.Namespace, io: Io, diag: Diagnostics, stats: Stats
) -> Iterator[tuple[str, Record]]:
    for source, n, line in read_lines(args.files, io):
        if not line.strip():
            continue
        record = parse_line(line)
        if record is None:
            if args.strict:
                raise CliError(f"{source}:{n}: malformed line: {line.rstrip()!r}")
            stats.malformed += 1
            diag.warn(f"{source}:{n}: skipping malformed line")
            continue
        yield line, record


# endregion io


# region commands
def cmd_stats(args: argparse.Namespace, settings: Settings, io: Io, diag: Diagnostics) -> int:
    stats = Stats()
    for _, record in records(args, io, diag, stats):
        stats.add(record)
    if args.json:
        io.stdout.write(render_json(stats.as_json()))
    else:
        color = use_color(settings.color.value, isatty=io.stdout.isatty(), env=io.env)
        io.stdout.write(render_table(stats, color=color))
    return 0


def cmd_filter(args: argparse.Namespace, settings: Settings, io: Io, diag: Diagnostics) -> int:
    minimum = settings.min_level.value
    for line, record in records(args, io, diag, Stats()):
        if at_least(record.level, minimum):
            # Stream each match as it is found, so `logq filter | head` stops early.
            io.stdout.write(render_json(record_json(record)) if args.json else line.rstrip("\n") + "\n")
    return 0


COMMANDS = {"stats": cmd_stats, "filter": cmd_filter}
# endregion commands


# region main
def main(
    argv: Sequence[str] | None = None,
    *,
    stdin: TextIO | None = None,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
    env: Mapping[str, str] | None = None,
) -> int:
    io = Io(
        stdin or sys.stdin, stdout or sys.stdout, stderr or sys.stderr, os.environ if env is None else env
    )
    try:
        args = build_parser().parse_args(argv)
    except SystemExit as exit_:  # --help, --version and usage errors: argparse already printed
        return exit_.code if isinstance(exit_.code, int) else 2

    diag = Diagnostics(io.stderr, verbose=args.verbose, quiet=args.quiet)
    try:
        path = config_path(args.config, io.env)
        settings = resolve_settings(
            flags={"min_level": getattr(args, "min_level", None), "color": args.color},
            env=io.env,
            file=load_config_file(path) if path else None,
        )
        diag.detail(f"min_level={settings.min_level.value} (from {settings.min_level.source})")
        diag.detail(f"color={settings.color.value} (from {settings.color.source})")
        return COMMANDS[args.command](args, settings, io, diag)
    except CliError as error:
        diag.error(str(error))
        return error.exit_code


# endregion main


# region entry
def entry() -> int:
    """The installed command: `main` plus the two ways a user stops a CLI."""
    try:
        code = main()
        # Small output can still be sitting in stdout's buffer. Flush it here,
        # so a closed pipe surfaces in this `try` and not during interpreter exit.
        sys.stdout.flush()
        return code
    except KeyboardInterrupt:
        # Ctrl-C is a normal way to stop: no traceback, and 128 + SIGINT so a
        # calling script knows the run was interrupted, not successful.
        print(file=sys.stderr)
        return 130
    except BrokenPipeError:
        # The reader went away (`logq filter big.log | head -1`). The failed
        # write is still buffered, and Python retries it at exit; pointing
        # stdout at /dev/null lets that retry succeed silently. Then exit like
        # a tool killed by SIGPIPE would (128 + 13).
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 141


# endregion entry
