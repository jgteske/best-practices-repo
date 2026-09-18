#!/usr/bin/env bash
#
# Exercises the Poetry projects in this folder the way the packaging pages
# describe them. Called by scripts/check-python.sh when `poetry` is installed.
#
#   slugkit      sync the venv, run its tests/mypy/ruff, build the wheel, then
#                install that wheel into a clean venv and run the console script;
#                finally bundle the CLI with PyInstaller and run the executable
#                with an empty environment (no Python on PATH)
#   blog-app     install slugkit as an editable path dependency and run the app
#   acme-*       build both namespace distributions, install both wheels into
#                one venv, and import across them
#
set -euo pipefail

cd "$(dirname -- "$0")"

export POETRY_VIRTUALENVS_IN_PROJECT=true  # .venv/ inside each project (git-ignored)
export POETRY_NO_INTERACTION=1
export PYTHONDONTWRITEBYTECODE=1           # no __pycache__ litter in the tree

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

expect() {  # expect <label> <expected substring> <actual output>
  if [[ "$3" == *"$2"* ]]; then
    echo "  ok         $1"
  else
    echo "  FAILED     $1: expected '$2' in:" >&2
    printf '%s\n' "$3" | sed 's/^/    | /' >&2
    return 1
  fi
}

echo "slugkit"
(
  cd slugkit
  poetry check --lock --quiet
  # venv == lock file: dev group plus the optional bundle group, nothing else
  poetry sync --quiet --with bundle
  poetry run pytest -q -p no:cacheprovider
  poetry run mypy src tests
  poetry run ruff check --quiet .
  poetry run ruff format --check --quiet .
  rm -rf dist && poetry build --quiet
)
wheel=$(echo slugkit/dist/slugkit-*.whl)
"${PYTHON:-python3}" -m venv "$scratch/slugkit-venv"
"$scratch/slugkit-venv/bin/pip" install --quiet --no-index "$wheel"
expect "wheel installs a working console script" "hello-world" \
  "$("$scratch/slugkit-venv/bin/slugkit" slug 'Hello, World!')"

(
  cd slugkit
  poetry run pyinstaller --log-level WARN --noconfirm --onefile --name slugkit \
    --distpath "$scratch/bundle/dist" --workpath "$scratch/bundle/build" --specpath "$scratch/bundle" \
    packaging/slugkit_cli.py
)
expect "PyInstaller executable runs without Python installed" "hello-world" \
  "$(env -i "$scratch/bundle/dist/slugkit" slug 'Hello, World!')"

echo "blog-app"
(
  cd blog-app
  poetry check --lock --quiet
  poetry sync --quiet
)
expect "imports slugkit through the editable path dependency" "/blog/hello-world-2/" \
  "$(cd blog-app && poetry run blog-app)"

echo "acme-core + acme-report"
for project in acme-core acme-report; do
  (cd "$project" && poetry check --lock --quiet && rm -rf dist && poetry build --quiet)
done
"${PYTHON:-python3}" -m venv "$scratch/acme-venv"
# --no-index + --find-links: resolve acme-report's dependency on acme-core from
# the freshly built wheels only, the way a private index would serve them.
"$scratch/acme-venv/bin/pip" install --quiet --no-index --find-links acme-core/dist --find-links acme-report/dist acme-report
expect "both wheels share the acme namespace" "{'eu': 750}" \
  "$("$scratch/acme-venv/bin/python" -c 'from acme.core import Sale; from acme.report import totals_by_region; print(totals_by_region([Sale("eu", 500), Sale("eu", 250)]))')"
