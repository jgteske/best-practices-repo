# Text Processing

Unix's core idea: many small filters that read stdin and write stdout, composed
with pipes. Learn six of them well and you can answer almost any question about
a log file without leaving the terminal.

## Looking at a file

| Command | Use |
| --- | --- |
| `cat file` | dump it (fine for small files; `cat f \| grep x` is a wasted process - use `grep x f`) |
| `less file` | page through it: `/search`, `n`/`N`, `g`/`G`, `q`. `-S` stops line wrapping, `+F` follows like `tail -f` |
| `head -20 file` | first 20 lines (`-c 100` for bytes) |
| `tail -20 file` | last 20 lines |
| `tail -f file` | **follow** a growing file - the log-watching command |
| `tail -F file` | same, but survives log rotation |
| `nl file` | number the lines |
| `wc -l file` | count lines (`-w` words, `-c` bytes) |

## `grep`: find the lines

```bash
grep 'ERROR' app.log                # fixed-ish pattern (basic regex)
grep -i 'error' app.log             # case-insensitive
grep -v 'DEBUG' app.log             # invert: everything that does NOT match
grep -c 'ERROR' app.log             # count matching lines
grep -n 'ERROR' app.log             # prefix with line numbers
grep -l 'TODO' -r src/              # just the filenames that match
grep -w 'id' app.log                # whole word only ("uuid" won't match)
grep -E 'WARN|ERROR' app.log        # extended regex: alternation, +, ?, {n,m}
grep -F "$literal" app.log          # fixed string: no regex, and much faster
grep -C 3 'panic' app.log           # 3 lines of context around each hit (-A after, -B before)
grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' app.log   # print only the match, not the line
```

`grep -q` prints nothing and just sets the exit status - the right form inside
`if`. On a source tree, `grep -rn --include='*.ts' 'pattern' .` is the everyday
form; `ripgrep` (`rg`) does the same thing faster and skips `.gitignore`d files.

::: tip Quote your patterns
`grep [0-9] file` lets the **shell** try to expand `[0-9]` as a glob first.
Single-quote every pattern that contains regex metacharacters.
:::

## `sed`: edit the stream

95% of real `sed` usage is one substitution:

```bash
sed 's/old/new/' file            # first match on each line
sed 's/old/new/g' file           # every match
sed -E 's/(a+)b/[\1]/g' file     # extended regex; \1 is the first capture group
sed -i.bak 's/old/new/g' file    # edit the file in place, keeping file.bak
sed -n '5,10p' file              # print only lines 5-10 (-n suppresses default printing)
sed '/^#/d' file                 # delete comment lines
sed '/^$/d' file                 # delete blank lines
sed -n '/BEGIN/,/END/p' file     # print an inclusive range between two patterns
sed '2i\inserted line' file      # insert before line 2 (a\ appends after)
```

Pick a different delimiter when the pattern contains slashes - `sed 's|/usr/local|/opt|g'`
beats escaping every one.

::: warning `sed -i` differs across platforms
GNU sed takes `-i` with an optional suffix attached (`-i.bak`); BSD/macOS sed
**requires** an argument (`-i ''`). A script using `-i` is not portable unless
you always pass a suffix.
:::

## `awk`: a whole language for columns

`awk` splits each line into fields (`$1`, `$2`, … `$NF` = last) and runs
`pattern { action }` on every line.

```bash
awk '{print $1}' access.log                    # first field
awk -F: '{print $1, $7}' /etc/passwd           # custom field separator
awk '$9 >= 500 {print $7}' access.log          # filter on a field, then project
awk 'NR > 1 {sum += $3} END {print sum}' data.tsv     # skip a header, total a column
awk '{count[$1]++} END {for (k in count) print count[k], k}' access.log
awk 'length > 80 {print FILENAME ":" NR}' src/*.c     # long lines, with location
awk '!seen[$0]++' file                          # deduplicate, preserving order
```

Useful built-ins: `NR` (record number), `NF` (field count), `FILENAME`, `FS`/`OFS`
(input/output field separators), `BEGIN`/`END` blocks, `printf` for formatting.

**When to switch to awk:** the moment a pipeline reaches `grep | cut | sort |
awk`, one `awk` program is usually shorter, clearer, and reads the input once
instead of four times.

## Sorting, counting, and slicing

```bash
sort file                 # lexicographic
sort -n / -h              # numeric / human-readable (2K < 1M)
sort -r                   # reverse
sort -u                   # sort and drop duplicates
sort -k2,2 -t, file       # by the 2nd comma-separated field only
sort -k3,3nr file         # by field 3, numeric, descending

uniq -c                   # count consecutive duplicates - REQUIRES sorted input
uniq -d / -u              # only duplicated / only unique lines

cut -d: -f1,7 /etc/passwd # fields by delimiter
cut -c1-10 file           # character ranges

tr 'a-z' 'A-Z' < file     # translate characters
tr -d '\r' < file         # delete characters (strip CRLF)
tr -s ' '                 # squeeze runs of spaces into one

paste a.txt b.txt         # join files side by side
join -t, -1 1 -2 1 a b    # relational join on a key (both must be sorted)
comm -13 old new          # set operations on sorted files
column -t -s,             # align columns for reading
```

`sort | uniq -c | sort -rn` is *the* "top N by frequency" idiom, worth
memorising as one unit.

## Structured data: `jq`

Never parse JSON with `grep`. `jq` is a proper query language for it:

```bash
curl -s api/users | jq '.[0].name'                  # index and field access
jq -r '.items[] | .id' data.json                    # -r drops the quotes
jq '.items[] | select(.status == "error")' data.json
jq -r '.items[] | [.id, .name] | @tsv' data.json    # emit TSV for cut/awk
jq 'map(.size) | add' data.json                     # aggregate
jq -s '.' *.json                                    # slurp many files into one array
```

The equivalents for other formats: `yq` for YAML, `xmlstarlet` for XML,
`miller` (`mlr`) for CSV/TSV with headers.

## A worked pipeline

This script answers the usual questions about an access log, and shows where a
pipeline should give way to a single `awk` program:

<<< ../../examples/bash/pipelines/log-report.sh

## Summary

- `less`, `head`, `tail -f` to look; `grep` to filter; `sed` to rewrite; `awk`
  for anything involving columns or arithmetic.
- `grep -q` in conditions, `grep -F` for literals, always quote the pattern.
- `sed 's/x/y/g'` covers most uses; `-i` is not portable without a suffix.
- **`sort | uniq -c | sort -rn`** is the top-N idiom.
- Collapse a long pipeline into one `awk` when it passes ~4 stages.
- Use `jq` for JSON - never regex.
