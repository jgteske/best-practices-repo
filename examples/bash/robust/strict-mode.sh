#!/usr/bin/env bash
#
# The three-line preamble that turns a shell script from "hopes for the best"
# into something that fails loudly at the first sign of trouble.
#
#   -e            exit as soon as any command fails (non-zero status)
#   -u            treat an unset variable as an error, not as an empty string
#   -o pipefail   a pipeline fails if ANY stage fails, not just the last one
#
# Without pipefail, `grep pattern file | sort` succeeds even when grep dies.
# Without -u, a typo like ${destinaton} silently expands to "" - and
# `rm -rf "${destinaton}/"` becomes `rm -rf /`.
set -euo pipefail

# IFS controls word splitting. Restricting it to newline+tab means a filename
# containing spaces is never split into two arguments.
IFS=$'\n\t'

# --- Working with -e safely ----------------------------------------------------
# `set -e` exits on ANY unchecked failure, including ones you expect. Say so
# explicitly instead of disabling it:

# 1. A command whose failure is fine: append `|| true`.
optional_count="$(grep -c "^ERROR" /var/log/syslog 2>/dev/null || true)"
echo "errors in syslog: ${optional_count:-0}"

# 2. A command you want to branch on: put it in `if`. Commands tested by `if`,
#    `while`, `&&`, `||` or negated with `!` never trigger the -e exit.
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is not installed; falling back to grep" >&2
fi

# 3. Capture the status yourself when you need the number.
set +e
curl -fsS --max-time 5 https://example.com/health >/dev/null 2>&1
status=$?
set -e
(( status == 0 )) && echo "health check ok" || echo "health check failed (${status})"

# --- Working with -u safely ----------------------------------------------------
# Under -u, referencing a possibly-unset variable needs an explicit default.
echo "log level: ${LOG_LEVEL:-info}"

# Same for positional parameters and arrays - "${arr[@]}" on an EMPTY array is
# an error in bash < 4.4, so give it a default there too.
first_arg="${1:-}"
echo "first argument: ${first_arg:-(none)}"

# --- Known limits of -e --------------------------------------------------------
# `set -e` is not a real exception system. It does NOT trigger for a failure
# inside a command substitution used in an assignment, and it is ignored inside
# functions called from a condition. Treat it as a safety net, not a guarantee:
# still check the things that matter.
echo "strict mode preamble complete"
