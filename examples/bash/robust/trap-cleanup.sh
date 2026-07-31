#!/usr/bin/env bash
# `trap` runs a handler when the shell receives a signal or is about to exit.
# It is the shell's equivalent of try/finally - the only reliable way to clean
# up temporary files, locks, and background jobs.
set -euo pipefail

# --- Temporary files done right -------------------------------------------------
# mktemp creates the file/directory atomically with safe permissions and a
# unique name. Never hand-roll /tmp/myscript.$$ - it is a symlink attack and a
# collision waiting to happen.
workdir="$(mktemp -d)"
outfile="$(mktemp)"

# EXIT fires on normal exit, on `exit 1`, and (with -e) on any failed command,
# so ONE handler covers every path out of the script.
cleanup() {
  local status=$?          # capture the real exit status before doing anything
  rm -rf -- "$workdir" "$outfile"
  (( status != 0 )) && echo "failed with status ${status}; workspace removed" >&2
  return "$status"
}
trap cleanup EXIT

# Signals get their own traps when you want a distinct message. Re-raising the
# signal after cleanup is the correct way to report "killed by a signal" to the
# parent process (the EXIT trap still runs).
trap 'echo "interrupted" >&2; exit 130' INT      # Ctrl-C
trap 'echo "terminated" >&2; exit 143' TERM      # kill

# --- A lock so two copies never run at once ------------------------------------
# flock takes a lock on a file descriptor; it is released automatically when the
# script exits, even if it crashes.
lockfile="/tmp/$(basename "$0").lock"
exec 9>"$lockfile"
if ! flock -n 9; then
  echo "another instance is already running" >&2
  exit 1
fi

# --- Cleaning up background jobs ------------------------------------------------
sleep 30 &
worker_pid=$!
# Add to the existing EXIT handling by making the handler itself do the work.
kill_worker() { kill "$worker_pid" 2>/dev/null || true; }
trap 'kill_worker; cleanup' EXIT

echo "working in ${workdir} (worker pid ${worker_pid})"
date > "${workdir}/timestamp"
wc -l < "${workdir}/timestamp" > "$outfile"
cat "$outfile"

# No manual cleanup at the end: the EXIT trap owns it, so early `exit`s and
# unexpected failures behave exactly like the happy path.
