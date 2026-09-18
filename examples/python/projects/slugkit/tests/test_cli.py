# region test-cli
import io
import subprocess
import sys

import pytest

from slugkit.cli import main


def test_slug_prints_one_line_per_title(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["slug", "Hello World", "Second Post"]) == 0
    assert capsys.readouterr().out == "hello-world\nsecond-post\n"


def test_reads_stdin_when_no_titles(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(sys, "stdin", io.StringIO("One\n\nTwo\n"))
    assert main(["slug"]) == 0
    assert capsys.readouterr().out == "one\ntwo\n"


def test_errors_go_to_stderr_with_exit_code_1(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["slug", "???"]) == 1
    captured = capsys.readouterr()
    assert captured.out == ""
    assert "nothing to slugify" in captured.err


def test_usage_errors_exit_with_2() -> None:
    with pytest.raises(SystemExit) as exit_info:  # argparse calls sys.exit(2)
        main(["slug", "--max-length", "many"])
    assert exit_info.value.code == 2


def test_python_dash_m_runs_the_same_cli() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "slugkit", "dedupe", "Post", "Post"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.split() == ["post", "post-2"]


# endregion test-cli
