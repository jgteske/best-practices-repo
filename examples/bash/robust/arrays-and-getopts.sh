#!/usr/bin/env bash
# Arrays, associative arrays, and parsing command-line options with getopts.
set -euo pipefail

# --- Indexed arrays -------------------------------------------------------------
services=(nginx postgres redis)
services+=(rabbitmq)                     # append

echo "${services[0]}"                    # nginx        - one element
echo "${services[@]}"                    # all elements, each a separate word
echo "${#services[@]}"                   # 4            - number of elements
echo "${services[*]}"                    # all elements joined by the first IFS char

# ALWAYS iterate with "${arr[@]}" in quotes; unquoted, elements with spaces split.
for service in "${services[@]}"; do
  echo "service: ${service}"
done

# Building a command safely: an array keeps arguments intact, a string does not.
# `cmd="rsync -a 'my dir' dest"; $cmd` breaks on the quotes; an array never does.
rsync_args=(--archive --delete --human-readable)
[[ "${DRY_RUN:-0}" == 1 ]] && rsync_args+=(--dry-run)
echo "would run: rsync ${rsync_args[*]} SRC DEST"

# Reading lines into an array (bash 4+): mapfile/readarray, no loop needed.
mapfile -t mounts < <(findmnt -rn -o TARGET 2>/dev/null || echo /)
echo "found ${#mounts[@]} mount point(s), first: ${mounts[0]}"

# --- Associative arrays (bash 4+) ------------------------------------------------
declare -A port_of=(
  [http]=80
  [https]=443
  [ssh]=22
)
port_of[postgres]=5432

echo "https listens on ${port_of[https]}"
for name in "${!port_of[@]}"; do          # ${!arr[@]} gives the KEYS
  echo "${name} -> ${port_of[$name]}"
done

# Membership test - the idiomatic "does this key exist" check.
if [[ -v port_of[ssh] ]]; then
  echo "ssh is a known service"
fi

# --- Option parsing with getopts -------------------------------------------------
# getopts handles short options (-v, -o file), bundling (-vf), and `--` for you.
# The leading ':' in the optstring enables silent error handling so you can
# print your own messages. A letter followed by ':' takes an argument.
verbose=0
output=""
retries=3

while getopts ":vo:r:h" opt; do
  case "$opt" in
    v) verbose=1 ;;
    o) output="$OPTARG" ;;
    r) retries="$OPTARG" ;;
    h) echo "usage: ${0##*/} [-v] [-o FILE] [-r N] TARGET..."; exit 0 ;;
    :) echo "option -${OPTARG} requires an argument" >&2; exit 64 ;;
    \?) echo "unknown option: -${OPTARG}" >&2; exit 64 ;;
  esac
done
shift $(( OPTIND - 1 ))     # drop the parsed options; "$@" is now the operands

if (( $# == 0 )); then
  echo "at least one TARGET is required" >&2
  exit 64
fi

targets=("$@")
(( verbose )) && echo "verbose on, retries=${retries}, output=${output:-stdout}"
echo "targets: ${targets[*]}"

# getopts does NOT do long options (--verbose). For those, loop over "$@"
# yourself with a `case` and `shift`, or accept the short forms only.
