#!/usr/bin/env bash
# Functions, arguments, and exit codes.

# --- Positional parameters -----------------------------------------------------
# $0 script name, $1..$9 arguments, $# count, "$@" all arguments as separate
# words. Always use "$@" (quoted) - "$*" joins everything into ONE word.
echo "script: $0, argument count: $#"

# --- A usage function and argument validation ----------------------------------
usage() {
  # Heredoc: everything until the terminator, with expansion. <<'EOF' (quoted)
  # would disable expansion.
  cat <<EOF
Usage: ${0##*/} SOURCE DEST [MODE]

  SOURCE  file to copy
  DEST    destination directory
  MODE    permissions to apply (default: 0644)
EOF
}

if (( $# < 2 )); then
  usage >&2                 # usage/errors go to stderr, not stdout
  exit 64                   # 64 = EX_USAGE by convention
fi

source_file="$1"
dest_dir="$2"
mode="${3:-0644}"           # optional third argument with a default

# --- Functions -----------------------------------------------------------------
# Inside a function, $1..$n are the FUNCTION's arguments, not the script's.
# `local` keeps variables out of the global scope - use it for every variable
# in every function.
log() {
  local level="$1"
  shift                     # drop $1, so "$@" is now just the message
  printf '[%s] %-5s %s\n' "$(date +%H:%M:%S)" "$level" "$*" >&2
}

# Return a STATUS (0-255) with `return`; return a VALUE by echoing it and
# capturing with $(...). A function is "true" when it returns 0.
is_writable_dir() {
  local dir="$1"
  [[ -d "$dir" && -w "$dir" ]]      # the test's own status becomes the return
}

file_size() {
  local path="$1"
  stat -c %s "$path"                # stdout is the "return value"
}

# Functions must be defined before they are called - a script is read top-down.
if ! is_writable_dir "$dest_dir"; then
  log ERROR "destination ${dest_dir} is not a writable directory"
  exit 1
fi

if [[ ! -f "$source_file" ]]; then
  log ERROR "no such file: ${source_file}"
  exit 1
fi

size="$(file_size "$source_file")"
log INFO "copying ${source_file} (${size} bytes) to ${dest_dir}"

install -m "$mode" "$source_file" "$dest_dir/"   # copy + set mode in one step
log INFO "done"

# --- Exit codes ----------------------------------------------------------------
# `$?` holds the status of the last command. Exit non-zero on failure so callers
# (and `set -e`, and CI) can detect it. 0 = success is the only universal rule.
exit 0
