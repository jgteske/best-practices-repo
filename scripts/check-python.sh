#!/usr/bin/env bash
#
# Verifies every Python example under examples/python/:
#   * every .py file is compiled to catch syntax errors (always runs, stdlib only)
#   * every standalone example is then executed and must exit 0
#   * mypy --strict, ruff and pytest run when they are installed; every
#     `# code  <- mypy: message` comment is checked against real mypy output
#   * the Poetry projects under examples/python/projects are built, installed
#     and exercised when `poetry` is installed
#
# This is the Python equivalent of `npm run check:js`: a snippet embedded in the
# docs cannot silently rot.
#
# "Standalone" means: not under projects/, not a test file, and not a module
# that lives inside a package (a directory with an __init__.py) - those are
# imported by a demo script rather than run on their own. A file that must not
# be executed unattended opts out with a marker comment anywhere in it:
#
#     # check-python: no-run
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

readonly RUN_TIMEOUT=60
readonly ROOT=examples/python
PYTHON=${PYTHON:-python3}

if ! "$PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 13))'; then
  echo "the Python examples need Python 3.13+, found: $("$PYTHON" --version 2>&1)" >&2
  exit 1
fi

mapfile -t sources < <(find "$ROOT" \( -name .venv -o -name dist -o -name __pycache__ -o -name '.*_cache' \) -prune \
  -o -type f -name '*.py' -print | sort)

if (( ${#sources[@]} == 0 )); then
  echo "no Python examples found under ${ROOT}" >&2
  exit 1
fi

failed=0
scratch_log=$(mktemp)
trap 'rm -f "$scratch_log"' EXIT

echo "compiling ${#sources[@]} files..."
for source in "${sources[@]}"; do
  # compile() in memory rather than py_compile, so no .pyc files land in the tree.
  if "$PYTHON" -B -c 'import sys; compile(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1], "exec")' "$source"; then
    echo "  syntax ok  ${source}"
  else
    echo "  SYNTAX ERROR  ${source}" >&2
    failed=1
  fi
done

echo
echo "running the standalone examples..."
ran=0
for source in "${sources[@]}"; do
  dir=$(dirname -- "$source")
  name=$(basename -- "$source")
  if [[ "$source" == "$ROOT"/projects/* || "$name" == test_* || "$name" == conftest.py || -f "$dir/__init__.py" ]]; then
    continue
  fi

  if grep -q 'check-python: no-run' "$source"; then
    echo "  skipped    ${source}  (marked no-run)"
    continue
  fi

  # Run from the file's own directory, the way a reader would, so that sibling
  # packages are importable. -B: no __pycache__ litter in the repo.
  if output=$(cd "$dir" && timeout "$RUN_TIMEOUT" "$PYTHON" -B "$name" 2>&1); then
    echo "  ran ok     ${source}"
    ran=$(( ran + 1 ))
  else
    status=$?
    if (( status == 124 )); then
      echo "  TIMED OUT (${RUN_TIMEOUT}s)  ${source}" >&2
    else
      echo "  FAILED (exit ${status})  ${source}" >&2
    fi
    printf '%s\n' "$output" | sed 's/^/    | /' >&2
    failed=1
  fi
done

echo
if command -v mypy >/dev/null 2>&1; then
  echo "type-checking with mypy --strict..."
  # projects/ is excluded here: each project is checked inside its own Poetry
  # environment, with its own [tool.mypy] settings, by check-projects.sh.
  (cd "$ROOT" && mypy --config-file mypy.ini .) || failed=1
  echo "checking the mypy errors quoted in comments..."
  "$PYTHON" -B scripts/check_mypy_comments.py "$ROOT" || failed=1
else
  echo "mypy not installed - skipping type checks (pip install mypy)"
fi

echo
if command -v ruff >/dev/null 2>&1; then
  echo "linting with ruff..."
  # No --config: ruff uses the nearest ruff.toml / [tool.ruff] for each file,
  # so a project's own pyproject.toml settings apply inside that project.
  ruff check "$ROOT" || failed=1
  ruff format --check "$ROOT" || failed=1
else
  echo "ruff not installed - skipping lint (pip install ruff)"
fi

echo
if "$PYTHON" -c 'import pytest' 2>/dev/null; then
  echo "running the pytest examples..."
  (cd "$ROOT/testing" && "$PYTHON" -B -m pytest -q -p no:cacheprovider) || failed=1
else
  echo "pytest not installed - skipping tests (pip install pytest)"
fi

echo
mapfile -t notebooks < <(find "$ROOT" -name .venv -prune -o -name '*.ipynb' -print | sort)
echo "checking ${#notebooks[@]} notebooks..."
for notebook in "${notebooks[@]}"; do
  # Committed notebooks carry no outputs: they are noise in diffs and can leak data.
  if ! "$PYTHON" -c '
import json, sys
cells = json.load(open(sys.argv[1], encoding="utf-8"))["cells"]
dirty = [c for c in cells if c["cell_type"] == "code" and (c["outputs"] or c["execution_count"])]
sys.exit(1 if dirty else 0)' "$notebook"; then
    echo "  HAS OUTPUTS  ${notebook}  (run: nbstripout ${notebook})" >&2
    failed=1
  elif command -v jupyter >/dev/null 2>&1; then
    # Execute top to bottom in a fresh kernel - the same as "Restart & Run All".
    if (cd "$(dirname -- "$notebook")" && PYTHONDONTWRITEBYTECODE=1 \
        jupyter nbconvert --to notebook --execute --stdout "$(basename -- "$notebook")" >/dev/null 2>"$scratch_log"); then
      echo "  ran ok     ${notebook}"
    else
      echo "  FAILED     ${notebook}" >&2
      sed 's/^/    | /' "$scratch_log" >&2
      failed=1
    fi
  else
    echo "  clean      ${notebook}  (jupyter not installed - not executed; pip install nbconvert ipykernel)"
  fi
done

echo
if command -v poetry >/dev/null 2>&1; then
  echo "building and installing the Poetry projects..."
  bash "$ROOT/projects/check-projects.sh" || failed=1
else
  echo "poetry not installed - skipping project builds (pipx install poetry)"
fi

if (( failed )); then
  echo >&2
  echo "Python example checks FAILED" >&2
  exit 1
fi

echo
echo "all ${#sources[@]} Python examples passed (${ran} executed)"
