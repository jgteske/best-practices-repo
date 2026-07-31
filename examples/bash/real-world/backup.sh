#!/usr/bin/env bash
#
# backup.sh - archive a directory, verify it, and prune old backups.
#
# Every practice from the previous pages, in one script you could actually put
# in cron: strict mode, a usage block, getopts, logging to stderr, a trap that
# cleans up, quoted expansions, arrays for command building, and real exit codes.
#
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly DEFAULT_KEEP=7

usage() {
  cat <<EOF
Usage: ${SCRIPT_NAME} [-k KEEP] [-n] SOURCE_DIR BACKUP_DIR

Create a timestamped tar.gz of SOURCE_DIR in BACKUP_DIR.

  -k KEEP  number of backups to retain (default: ${DEFAULT_KEEP})
  -n       dry run: show what would happen, change nothing
  -h       show this help

Exit codes: 0 ok, 1 runtime failure, 64 usage error.
EOF
}

# Logging goes to stderr so that stdout stays reserved for the script's actual
# output - here, the path of the archive it created. That makes the script
# usable in a pipeline: archive="$(backup.sh /srv /backups)".
log()  { printf '%s [%s] %s\n' "$(date +'%F %T')" "$1" "${*:2}" >&2; }
info() { log INFO "$@"; }
warn() { log WARN "$@"; }
die()  { log ERROR "$@"; exit 1; }
# A bad invocation and a runtime failure are different things - give them
# different exit codes so a caller can tell "you called me wrong" from
# "something broke".
die_usage() { log ERROR "$@"; usage >&2; exit 64; }

keep="$DEFAULT_KEEP"
dry_run=0

while getopts ":k:nh" opt; do
  case "$opt" in
    k) keep="$OPTARG" ;;
    n) dry_run=1 ;;
    h) usage; exit 0 ;;
    :) echo "option -${OPTARG} requires an argument" >&2; usage >&2; exit 64 ;;
    \?) echo "unknown option: -${OPTARG}" >&2; usage >&2; exit 64 ;;
  esac
done
shift $(( OPTIND - 1 ))

(( $# == 2 )) || { usage >&2; exit 64; }

source_dir="$1"
backup_dir="$2"

# Validate everything up front, with a specific message per failure. A script
# that dies at step 6 because of a typo in argument 1 is a bad script.
[[ -d "$source_dir" ]] || die "source is not a directory: ${source_dir}"
[[ -r "$source_dir" ]] || die "source is not readable: ${source_dir}"
[[ "$keep" =~ ^[0-9]+$ ]] || die_usage "-k expects a number, got: ${keep}"
(( keep >= 1 )) || die_usage "-k must be at least 1"

mkdir -p -- "$backup_dir" || die "cannot create ${backup_dir}"
[[ -w "$backup_dir" ]] || die "backup directory is not writable: ${backup_dir}"

# Build the archive in a temp file and move it into place only once it is
# complete and verified - an interrupted run must never leave a half-written
# archive that looks like a valid backup. `mv` within one filesystem is atomic.
staging="$(mktemp -d)"
cleanup() {
  local status=$?
  rm -rf -- "$staging"
  (( status == 0 )) || warn "exiting with status ${status}"
  return "$status"
}
trap cleanup EXIT
trap 'die "interrupted"' INT TERM

timestamp="$(date +%Y%m%dT%H%M%S)"
name="$(basename -- "$source_dir")-${timestamp}.tar.gz"
tmp_archive="${staging}/${name}"
final_archive="${backup_dir}/${name}"

# An array keeps each argument a separate word, so paths with spaces survive and
# conditional flags are easy to add.
tar_args=(--create --gzip --file "$tmp_archive" --directory "$(dirname -- "$source_dir")")
[[ -f "${source_dir}/.backupignore" ]] && tar_args+=(--exclude-from "${source_dir}/.backupignore")
tar_args+=("$(basename -- "$source_dir")")

if (( dry_run )); then
  info "[dry run] tar ${tar_args[*]}"
  info "[dry run] would keep the ${keep} most recent backups in ${backup_dir}"
  exit 0
fi

info "archiving ${source_dir}"
tar "${tar_args[@]}" || die "tar failed"

# Verify before trusting it: a gzip stream that does not decompress is not a
# backup. `-t` tests the archive without extracting anything.
info "verifying archive"
tar --test --file "$tmp_archive" >/dev/null 2>&1 || die "archive failed verification"

size="$(du -h -- "$tmp_archive" | cut -f1)"
mv -- "$tmp_archive" "$final_archive"
info "created ${final_archive} (${size})"

# Prune: list newest-first, skip the ones to keep, delete the rest. -print0 /
# read -d '' is the pairing that survives spaces and newlines in filenames.
info "pruning old backups (keeping ${keep})"
mapfile -t -d '' old_backups < <(
  find "$backup_dir" -maxdepth 1 -type f -name '*.tar.gz' -printf '%T@ %p\0' \
    | sort -zrn \
    | tail -z -n "+$(( keep + 1 ))" \
    | cut -z -d' ' -f2-
)

if (( ${#old_backups[@]} == 0 )); then
  info "nothing to prune"
else
  for old in "${old_backups[@]}"; do
    info "removing ${old}"
    rm -f -- "$old"
  done
fi

# The one thing on stdout: the artifact this script produced.
printf '%s\n' "$final_archive"
