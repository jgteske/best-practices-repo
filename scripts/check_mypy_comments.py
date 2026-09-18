"""Verify the mypy errors quoted in example comments.

The Python examples show what the type checker rejects with commented-out lines:

    # append_half(ints)  <- mypy: Argument 1 to "append_half" has incompatible type ...

For each such line this script writes a copy of the file with that one line
uncommented, runs mypy on the copy, and fails unless the quoted message is in
mypy's output. A claim about a checker error is then as verified as a claim
about program output.

Usage: python3 scripts/check_mypy_comments.py examples/python
"""

import re
import subprocess
import sys
import tempfile
from pathlib import Path

EXPECTED = re.compile(r"^(?P<indent>\s*)# (?P<code>.+?)  <- mypy: (?P<message>.+)$")


def main(root: Path) -> int:
    config = root / "mypy.ini"
    checked = failed = 0
    for source in sorted(root.rglob("*.py")):
        if "projects" in source.relative_to(root).parts:
            continue
        lines = source.read_text(encoding="utf-8").splitlines()
        for index, line in enumerate(lines):
            match = EXPECTED.match(line)
            if match is None:
                continue
            variant = [*lines[:index], match["indent"] + match["code"], *lines[index + 1 :]]
            with tempfile.TemporaryDirectory() as tmp:
                copy = Path(tmp, source.name)
                copy.write_text("\n".join(variant) + "\n", encoding="utf-8")
                result = subprocess.run(
                    ["mypy", "--config-file", str(config), "--no-incremental", str(copy)],
                    capture_output=True,
                    text=True,
                )
            checked += 1
            location = f"{source}:{index + 1}"
            if match["message"] in result.stdout:
                print(f"  ok         {location}")
            else:
                failed += 1
                print(f"  MISMATCH   {location}: expected {match['message']!r}", file=sys.stderr)
                for reported in result.stdout.splitlines():
                    if f":{index + 1}: error:" in reported:
                        print(f"    | {reported}", file=sys.stderr)
    print(f"{checked} quoted mypy errors checked, {failed} mismatched")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
