#!/usr/bin/env bash
# Variables, expansion, and the quoting rules that cause most shell bugs.

# Assignment: NO spaces around `=`. `name = "x"` runs the command `name`.
name="world"
count=3

# Expansion. Braces are only required to disambiguate, but they never hurt.
echo "Hello, ${name}!"          # -> Hello, world!
echo "${name}_backup"           # without braces, $name_backup is a *different* variable

# --- Quoting ------------------------------------------------------------------
# "double quotes"  -> expand variables and command substitution
# 'single quotes'  -> literal, no expansion at all
# no quotes        -> expand, THEN word-split and glob-expand the result
file="my report.txt"
echo "$file"                    # my report.txt   (one word - correct)
# shellcheck disable=SC2086     # (deliberate demonstration of the bug)
echo $file                      # my report.txt   printed as TWO words

# The rule: quote every expansion unless you specifically want splitting.
# `rm $file` above would try to delete "my" and "report.txt".

# --- Command substitution -----------------------------------------------------
# $(...) is the modern form: nestable and readable. Backticks are legacy.
today="$(date +%Y-%m-%d)"
kernel="$(uname -r)"
echo "Report for ${today} on kernel ${kernel}"

# --- Defaults and required values ---------------------------------------------
# ${VAR:-default}  use default if VAR is unset OR empty (does not assign)
# ${VAR:=default}  same, but also assigns it
# ${VAR:?message}  abort with `message` if unset or empty - great for config
target="${TARGET_DIR:-/tmp}"
: "${USER:?USER must be set}"
echo "Deploying to ${target} as ${USER}"

# --- String manipulation (no external commands needed) ------------------------
path="/var/log/nginx/access.log"
echo "${path##*/}"              # access.log     - strip longest leading */
echo "${path%/*}"               # /var/log/nginx - strip shortest trailing /*
echo "${path%.log}.log.1"       # rename the extension
echo "${#path}"                 # 25 - string length
echo "${path//\//-}"            # replace every / with -

# --- Arithmetic ---------------------------------------------------------------
# $((...)) is integer-only. Use awk or bc for floating point.
echo "$((count * 2))"           # 6
(( count++ ))                   # increment in place
echo "count is now ${count}"

# --- Environment vs shell variables -------------------------------------------
local_only="not exported"       # visible to this script only
export SHARED="exported"        # visible to child processes too
echo "${local_only} / ${SHARED}"
