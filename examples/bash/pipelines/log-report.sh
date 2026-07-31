#!/usr/bin/env bash
# Text-processing pipelines: the classic Unix approach of chaining small
# single-purpose filters, each reading stdin and writing stdout.
set -euo pipefail

log="${1:-/var/log/nginx/access.log}"

# --- Top 10 client IPs ----------------------------------------------------------
# awk prints one field per line; sort+uniq -c is the canonical "count by key"
# idiom; sort -rn puts the biggest first; head trims the report.
echo "== Top 10 clients =="
awk '{print $1}' "$log" \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -10

# --- Requests per hour ----------------------------------------------------------
# cut is faster than awk when you only need fixed byte/character ranges.
echo "== Requests per hour =="
cut -d'[' -f2 "$log" | cut -d: -f1-2 | sort | uniq -c

# --- Error rate with a single awk program ---------------------------------------
# When a pipeline grows past ~4 stages, one awk program is usually clearer and
# an order of magnitude faster: awk reads the file once instead of N times.
echo "== Status summary =="
awk '
  { total++; class = substr($9, 1, 1) "xx"; count[class]++ }
  END {
    for (c in count) printf "%s %6d %5.1f%%\n", c, count[c], 100 * count[c] / total
    printf "total %5d\n", total
  }
' "$log" | sort

# --- grep: find the lines, then look around them --------------------------------
# -E extended regex, -i case-insensitive, -v invert, -c count, -l names only,
# -r recursive, -n line numbers, -A/-B/-C lines of context after/before/around.
echo "== Recent 5xx with context =="
grep -E ' (5[0-9]{2}) ' "$log" | tail -20 || echo "(no 5xx found)"

# --- sed: stream editing --------------------------------------------------------
# s/pattern/replacement/flags is 95% of sed usage. Redact query strings so the
# report can be shared:
echo "== Redacted sample =="
sed -E 's/\?[^ "]*/?<redacted>/g' "$log" | head -3

# --- tee: branch a stream --------------------------------------------------------
# Write to a file AND keep the data flowing down the pipe.
echo "== Saving unique user agents =="
awk -F'"' '{print $6}' "$log" \
  | sort -u \
  | tee /tmp/user-agents.txt \
  | wc -l

# --- xargs: turn stdin into arguments ---------------------------------------------
# -0 with `find -print0` is the only safe pairing when filenames may contain
# spaces or newlines. -n/-P control batch size and parallelism.
echo "== Compressing rotated logs =="
find /var/log -maxdepth 1 -name '*.log.[0-9]' -print0 2>/dev/null \
  | xargs -0 -r -P 4 -n 1 gzip -f

# --- Process substitution: a command that looks like a file -------------------------
# <(cmd) exposes a command's output as a filename - useful for tools that
# refuse to read stdin, and for comparing two live outputs.
# `comm` needs both inputs sorted; -13 hides "only in file 1" and "in both",
# leaving only the addresses that appear in today's log and not yesterday's.
echo "== Clients seen today but not yesterday =="
comm -13 \
  <(awk '{print $1}' "${log}.1" 2>/dev/null | sort -u) \
  <(awk '{print $1}' "$log" | sort -u) \
  | head -5 || true
