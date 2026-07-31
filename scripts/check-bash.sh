#!/usr/bin/env bash
#
# Verifies every shell example under examples/bash/:
#   * `bash -n` parses each script (always runs)
#   * `shellcheck` lints each script, if it is installed
#
# This is the shell equivalent of `npm run typecheck` for the TypeScript
# examples: a snippet embedded in the docs cannot silently stop being valid.
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

mapfile -t scripts < <(find examples/bash -type f -name '*.sh' | sort)

if (( ${#scripts[@]} == 0 )); then
  echo "no shell examples found under examples/bash" >&2
  exit 1
fi

failed=0

for script in "${scripts[@]}"; do
  if bash -n "$script"; then
    echo "  syntax ok  ${script}"
  else
    echo "  SYNTAX ERROR  ${script}" >&2
    failed=1
  fi
done

if command -v shellcheck >/dev/null 2>&1; then
  echo "running shellcheck..."
  shellcheck --severity=warning "${scripts[@]}" || failed=1
else
  echo "shellcheck not installed - skipping lint (install it for stricter checks)"
fi

if (( failed )); then
  echo "shell example checks FAILED" >&2
  exit 1
fi

echo "all ${#scripts[@]} shell examples passed"
