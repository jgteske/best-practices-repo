#!/usr/bin/env bash
#
# Verifies every JavaScript example under examples/javascript/:
#   * `node --check` parses each .mjs/.cjs file (always runs, no dependencies)
#   * every example is then actually executed and must exit 0
#   * `node --test` runs the *.test.mjs files
#
# This is the JavaScript equivalent of `npm run typecheck` and
# `npm run check:bash`: a snippet embedded in the docs cannot silently rot.
#
# A file that must not be executed unattended (one that listens forever, or
# needs credentials) opts out of step 2 with a marker comment anywhere in it:
#
#     // check-js: no-run
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

# Seconds any single example may run before it is considered hung.
readonly RUN_TIMEOUT=60

mapfile -t sources < <(find examples/javascript -type f \( -name '*.mjs' -o -name '*.cjs' \) | sort)

if (( ${#sources[@]} == 0 )); then
  echo "no JavaScript examples found under examples/javascript" >&2
  exit 1
fi

failed=0

echo "parsing ${#sources[@]} files with node --check..."
for source in "${sources[@]}"; do
  if node --check "$source" 2>/dev/null; then
    echo "  syntax ok  ${source}"
  else
    echo "  SYNTAX ERROR  ${source}" >&2
    node --check "$source" || true
    failed=1
  fi
done

echo
echo "running the executable examples..."
ran=0
for source in "${sources[@]}"; do
  # Test files are run by `node --test` below, not on their own.
  if [[ "$source" == *.test.mjs ]]; then
    continue
  fi

  if grep -q 'check-js: no-run' "$source"; then
    echo "  skipped    ${source}  (marked no-run)"
    continue
  fi

  if output=$(timeout "$RUN_TIMEOUT" node "$source" 2>&1); then
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
echo "running the test suite..."
if ! node --test 'examples/javascript/**/*.test.mjs'; then
  failed=1
fi

if (( failed )); then
  echo >&2
  echo "JavaScript example checks FAILED" >&2
  exit 1
fi

echo
echo "all ${#sources[@]} JavaScript examples passed (${ran} executed)"
