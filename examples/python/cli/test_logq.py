"""Tests for logq. Most call main() in-process with fake streams and a fake
environment; a few run the real `python -m logq` to test the process-level
behaviour (pipes, signals) that in-process tests can't see."""

import io
import json
import os
import signal
import subprocess
import sys
from pathlib import Path

import pytest

from logq.cli import main
from logq.config import ColorMode, resolve_settings
from logq.core import CliError
from logq.output import use_color

HERE = Path(__file__).parent
SAMPLE = str(HERE / "sample.log")


class FakeTty(io.StringIO):
    def isatty(self) -> bool:
        return True


def run(*argv: str, stdin: str = "", env: dict[str, str] | None = None) -> tuple[int, str, str]:
    """main() with captured stdout/stderr and an empty environment by default."""
    out, err = io.StringIO(), io.StringIO()
    code = main(list(argv), stdin=io.StringIO(stdin), stdout=out, stderr=err, env=env or {})
    return code, out.getvalue(), err.getvalue()


# region test-precedence
def test_defaults_apply_when_nothing_is_set() -> None:
    settings = resolve_settings(flags={}, env={}, file=None)
    assert (settings.min_level.value, settings.min_level.source) == ("INFO", "default")


@pytest.mark.parametrize(
    ("file", "env", "flag", "expected"),
    [
        ({"min_level": "debug"}, {}, None, ("DEBUG", "config.toml")),
        ({"min_level": "debug"}, {"LOGQ_MIN_LEVEL": "warn"}, None, ("WARN", "LOGQ_MIN_LEVEL")),
        ({"min_level": "debug"}, {"LOGQ_MIN_LEVEL": "warn"}, "ERROR", ("ERROR", "--min-level")),
        ({}, {"LOGQ_MIN_LEVEL": ""}, None, ("INFO", "default")),  # empty env var = unset
    ],
)
def test_flags_beat_env_beat_file_beat_defaults(
    file: dict[str, str], env: dict[str, str], flag: str | None, expected: tuple[str, str]
) -> None:
    settings = resolve_settings(flags={"min_level": flag}, env=env, file=("config.toml", file))
    assert (settings.min_level.value, settings.min_level.source) == expected


def test_a_bad_value_names_where_it_came_from() -> None:
    with pytest.raises(CliError, match=r"unknown level 'loud'.*\(from LOGQ_MIN_LEVEL\)"):
        resolve_settings(flags={}, env={"LOGQ_MIN_LEVEL": "loud"}, file=None)


def test_config_file_is_found_through_the_environment(tmp_path: Path) -> None:
    (tmp_path / "logq").mkdir()
    (tmp_path / "logq" / "config.toml").write_text('min_level = "error"\n')
    code, out, _ = run("filter", "-q", SAMPLE, env={"XDG_CONFIG_HOME": str(tmp_path)})
    assert code == 0
    assert out.splitlines() == ["2026-10-16T09:04:05Z ERROR upload failed: connection reset"]


def test_verbose_explains_each_setting() -> None:
    _, _, err = run("filter", "-v", SAMPLE, env={"LOGQ_MIN_LEVEL": "warn"})
    assert "min_level=WARN (from LOGQ_MIN_LEVEL)" in err
    assert "color=auto (from default)" in err


# endregion test-precedence


# region test-output
def test_stats_json_is_one_parseable_document() -> None:
    code, out, err = run("stats", "--json", SAMPLE)
    assert code == 0
    assert json.loads(out) == {
        "total": 6,
        "levels": {"DEBUG": 1, "INFO": 3, "WARN": 1, "ERROR": 1},
        "malformed": 1,
    }
    assert "skipping malformed line" in err  # diagnostics never pollute stdout


def test_quiet_silences_warnings_but_not_data() -> None:
    _, out, err = run("stats", "-q", SAMPLE)
    assert "total  6" in out
    assert err == ""


def test_reads_stdin_when_no_files_are_given() -> None:
    code, out, _ = run("filter", "-l", "warn", stdin="t1 INFO a\nt2 WARN b\n")
    assert (code, out) == (0, "t2 WARN b\n")


@pytest.mark.parametrize(
    ("mode", "isatty", "env", "expected"),
    [
        ("auto", True, {}, True),
        ("auto", False, {}, False),  # piped: no escape codes in the file
        ("auto", True, {"NO_COLOR": "1"}, False),
        ("auto", True, {"TERM": "dumb"}, False),
        ("auto", False, {"FORCE_COLOR": "1"}, True),
        ("always", False, {"NO_COLOR": "1"}, True),  # an explicit choice wins
        ("never", True, {}, False),
    ],
)
def test_color_follows_the_conventions(
    mode: ColorMode, isatty: bool, env: dict[str, str], expected: bool
) -> None:
    assert use_color(mode, isatty=isatty, env=env) is expected


def test_tables_are_coloured_only_on_a_terminal() -> None:
    tty = FakeTty()
    main(["stats", "-q", SAMPLE], stdout=tty, stderr=io.StringIO(), env={})
    assert "\x1b[1;31mERROR" in tty.getvalue()
    _, piped, _ = run("stats", "-q", SAMPLE)
    assert "\x1b[" not in piped


# endregion test-output


# region test-errors
def test_usage_errors_exit_2(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["filter", "--min-level", "loud"], env={}) == 2
    assert "invalid choice: 'LOUD'" in capsys.readouterr().err


def test_runtime_errors_exit_1_with_one_line() -> None:
    code, out, err = run("stats", "missing.log")
    assert (code, out, err) == (1, "", "logq: error: missing.log: no such file\n")


def test_strict_turns_a_malformed_line_into_an_error() -> None:
    code, _, err = run("stats", "--strict", SAMPLE)
    assert code == 1
    assert "sample.log:5: malformed line" in err


# endregion test-errors


# region test-process
def logq(*argv: str, stdin: int | None = None) -> "subprocess.Popen[str]":
    env = {"PATH": os.environ["PATH"], "PYTHONDONTWRITEBYTECODE": "1"}
    return subprocess.Popen(
        [sys.executable, "-m", "logq", *argv],
        cwd=HERE,
        env=env,
        text=True,
        stdin=stdin,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def test_a_closed_pipe_ends_quietly_with_141(tmp_path: Path) -> None:
    big = tmp_path / "big.log"
    big.write_text("".join(f"t{n} INFO line {n}\n" for n in range(200_000)))
    proc = logq("filter", str(big))
    assert proc.stdout is not None and proc.stderr is not None
    assert proc.stdout.readline() == "t0 INFO line 0\n"
    proc.stdout.close()  # what `head -1` does after its first line
    assert proc.wait(timeout=10) == 141
    assert proc.stderr.read() == ""  # no BrokenPipeError traceback


def test_a_reader_that_never_reads_also_gets_141() -> None:
    # Like `logq stats app.log | true`: the output is small enough to sit in
    # stdout's buffer, so the broken pipe only shows up when it is flushed.
    proc = logq("stats", "-q", SAMPLE)
    assert proc.stdout is not None and proc.stderr is not None
    proc.stdout.close()  # before the child has even started up
    assert proc.wait(timeout=10) == 141
    assert proc.stderr.read() == ""  # no "Exception ignored on flushing sys.stdout"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signals")
def test_ctrl_c_exits_130_without_a_traceback() -> None:
    proc = logq("stats", "-v", stdin=subprocess.PIPE)
    assert proc.stderr is not None
    proc.stderr.readline()  # -v prints before reading stdin: now it is waiting for input
    proc.send_signal(signal.SIGINT)
    _, err = proc.communicate(timeout=10)
    assert proc.returncode == 130
    assert "Traceback" not in err


# endregion test-process
