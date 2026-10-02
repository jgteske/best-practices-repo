#!/usr/bin/env bash
#
# Verifies every shell example under examples/bash/:
#   * `bash -n` parses each script (always runs)
#   * `shellcheck` lints each script, if it is installed
#   * scripts that opt in are then executed and must exit 0
#
# This is the shell equivalent of `npm run typecheck` for the TypeScript
# examples: a snippet embedded in the docs cannot silently stop being valid.
#
# Most shell examples must NOT run unattended (they back up, delete, or need
# root), so running is opt-in - the reverse of `check-js: no-run`. A script that
# is safe to run (it works only inside its own mktemp sandbox) says so with a
# marker line near the top:
#
#     # check-bash: run
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

# Seconds any single script may run before it is considered hung.
readonly RUN_TIMEOUT=60

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

echo
echo "running the scripts marked '# check-bash: run'..."
ran=0
for script in "${scripts[@]}"; do
  grep -qx '# check-bash: run' "$script" || continue

  if output=$(timeout "$RUN_TIMEOUT" bash "$script" 2>&1); then
    echo "  ran ok     ${script}"
    ran=$(( ran + 1 ))
  else
    status=$?
    if (( status == 124 )); then
      echo "  TIMED OUT (${RUN_TIMEOUT}s)  ${script}" >&2
    else
      echo "  FAILED (exit ${status})  ${script}" >&2
    fi
    printf '%s\n' "$output" | sed 's/^/    | /' >&2
    failed=1
  fi
done

if (( failed )); then
  echo "shell example checks FAILED" >&2
  exit 1
fi

echo "all ${#scripts[@]} shell examples passed (${ran} executed)"
