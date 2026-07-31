#!/usr/bin/env bash
# Conditionals, tests, and loops.

# --- Exit status is the boolean ------------------------------------------------
# Every command returns a status: 0 = success, non-zero = failure. `if` runs a
# COMMAND and branches on its status - it is not a "boolean expression" syntax.
if grep -q "^PermitRootLogin no" /etc/ssh/sshd_config 2>/dev/null; then
  echo "root login is disabled"
else
  echo "root login setting not found"
fi

# `&&` and `||` chain on status: run-if-success / run-if-failure.
mkdir -p /tmp/demo && echo "directory ready"
command -v curl >/dev/null || echo "curl is not installed"

# --- [[ ]] is the one to use in bash -------------------------------------------
# `[[ ]]` is a bash keyword: no word-splitting inside, supports && || and =~.
# `[ ]` is the POSIX command and needs every expansion quoted.
file="/etc/hostname"
count=7

if [[ -f "$file" && -r "$file" ]]; then
  echo "$file exists and is readable"
fi

if [[ "$count" -gt 5 ]]; then                 # -gt/-lt/-eq/-ne for numbers
  echo "count is greater than 5"
fi

if [[ "${USER:-}" == root ]]; then            # ==/!=/< for strings
  echo "running as root"
fi

if [[ "$file" == *.conf ]]; then              # unquoted right side = glob match
  echo "looks like a config file"
fi

if [[ "$file" =~ ^/etc/[a-z]+$ ]]; then       # =~ is a regex match
  echo "a top-level file under /etc"
fi

# Common file tests: -e exists, -f regular file, -d directory, -L symlink,
# -r/-w/-x readable/writable/executable, -s non-empty, -z/-n empty/non-empty string.

# --- case: cleaner than a chain of elifs ---------------------------------------
case "${1:-help}" in
  start)        echo "starting" ;;
  stop|halt)    echo "stopping" ;;          # multiple patterns
  restart)      echo "restarting" ;;
  *.log)        echo "that is a log file" ;;
  *)            echo "usage: $0 {start|stop|restart}" ;;
esac

# --- Loops ---------------------------------------------------------------------
# Over a list of words:
for service in nginx postgres redis; do
  echo "checking ${service}"
done

# Over files - use a GLOB, never `for f in $(ls)`: a glob handles spaces and
# newlines in filenames correctly, `ls` output does not.
for conf in /etc/*.conf; do
  [[ -e "$conf" ]] || continue              # a glob that matches nothing stays literal
  echo "found ${conf}"
done

# Over a numeric range:
for i in {1..5}; do
  echo "attempt ${i}"
done
for (( i = 0; i < 3; i++ )); do
  echo "index ${i}"
done

# Over lines of a file or command - `read -r` keeps backslashes literal, and
# IFS= stops leading/trailing whitespace being trimmed.
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue   # skip blanks and comments
  echo "line: ${line}"
done < /etc/hosts

# `until` loops while the command KEEPS FAILING - handy for waiting on a service.
attempts=0
until curl -fsS --max-time 2 http://localhost:8080/health >/dev/null 2>&1; do
  (( attempts++ ))
  (( attempts >= 3 )) && { echo "gave up after ${attempts} attempts"; break; }
  sleep 1
done

# `break` leaves the loop, `continue` skips to the next iteration.
