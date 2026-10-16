#!/usr/bin/env bash
#
# Verifies GitHub Actions workflows with actionlint (which also runs shellcheck
# over every `run:` script when shellcheck is installed):
#   * this repository's own .github/workflows must pass
#   * every example under examples/github-actions/.github/workflows must pass
#   * every file under examples/github-actions/must-fail must be REJECTED, with
#     each error its `# expect-error: <text>` lines name - so a fixture cannot
#     "fail" for some unrelated reason, like a YAML typo
#
# This is the workflow equivalent of `npm run check:bash`. actionlint is
# optional locally (like shellcheck); CI installs a pinned version.
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

readonly ROOT=examples/github-actions

if ! command -v actionlint >/dev/null 2>&1; then
  echo "actionlint not installed - skipping workflow checks (pip install actionlint-py, or brew install actionlint)"
  exit 0
fi
command -v shellcheck >/dev/null 2>&1 || echo "note: shellcheck not installed - run: scripts are not linted"

failed=0
sandbox=$(mktemp -d)
trap 'rm -rf -- "$sandbox"' EXIT

echo "linting this repository's workflows..."
if actionlint; then
  echo "  ok         .github/workflows"
else
  failed=1
fi

echo
echo "linting the example workflows..."
# actionlint resolves local `uses: ./.github/workflows/x.yml` against the git root,
# so lint the examples as a repository of their own.
cp -R "$ROOT/.github" "$sandbox/"
git -C "$sandbox" init -q
if (cd "$sandbox" && actionlint); then
  echo "  ok         ${ROOT}/.github/workflows ($(find "$ROOT/.github/workflows" -name '*.yml' | wc -l) files)"
else
  failed=1
fi

echo
echo "checking that the must-fail examples are rejected..."
for fixture in "$ROOT"/must-fail/*.yml; do
  if output=$(actionlint -no-color "$fixture" 2>&1); then
    echo "  NOT REJECTED  ${fixture}" >&2
    failed=1
    continue
  fi
  missing=0
  while IFS= read -r expected; do
    if ! grep -qF -- "$expected" <<<"$output"; then
      echo "  MISSING ERROR  ${fixture}: ${expected}" >&2
      missing=1
    fi
  done < <(sed -n 's/^# expect-error: //p' "$fixture")
  if (( missing )); then
    printf '%s\n' "$output" | sed 's/^/    | /' >&2
    failed=1
  else
    echo "  rejected   ${fixture}  ($(grep -c '^# expect-error: ' "$fixture") expected errors)"
  fi
done

if (( failed )); then
  echo >&2
  echo "workflow checks FAILED" >&2
  exit 1
fi

echo
echo "all workflow checks passed"
