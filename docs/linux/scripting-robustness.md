# Writing Robust Scripts

A script that works on your laptop and destroys a server differs from a good one
in about ten lines. This page collects them.

## The preamble

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Option | Without it |
| --- | --- |
| `-e` | a failing command is ignored and the script carries on with bad state |
| `-u` | a typo'd variable expands to the empty string - `rm -rf "${destinaton}/"` becomes `rm -rf /` |
| `-o pipefail` | `generate \| filter > out` reports success even when `generate` crashed |

<<< ../../examples/bash/robust/strict-mode.sh

::: warning `set -e` is a safety net, not an exception system
It does **not** fire for a command whose failure is already being tested (`if`,
`while`, `&&`, `||`, `!`), nor for a failure inside a command substitution in an
assignment (`x="$(false)"` succeeds), and its behaviour inside functions called
from a condition surprises everyone eventually. Keep it on - it catches the
common cases - but still check the operations that actually matter.
:::

The three ways to tell it you *expect* a failure:

```bash
cmd || true                       # ignore it
if ! cmd; then ...; fi            # branch on it
set +e; cmd; status=$?; set -e    # capture the exact code
```

## Clean up with `trap`

`trap` is the shell's `finally`. One `EXIT` handler covers every way out of the
script - normal end, `exit 1`, a `set -e` abort, or a signal.

<<< ../../examples/bash/robust/trap-cleanup.sh

The rules that make traps reliable:

- **Capture `$?` first** in the handler; anything you run inside it overwrites
  the status you meant to report.
- **`mktemp` / `mktemp -d`** for every temporary path. A predictable
  `/tmp/$$.tmp` is a symlink attack and a collision.
- **Trap `EXIT` for cleanup**, and `INT`/`TERM` only when you need a distinct
  message or exit code (`130`/`143`).
- **`flock` for mutual exclusion.** The lock is released by the kernel when the
  process dies, so a crashed run cannot leave a stale lockfile behind - which is
  exactly what hand-rolled `[[ -f lockfile ]]` checks get wrong.

## Arrays and option parsing

Building a command as a **string** and letting the shell re-split it breaks the
moment an argument contains a space. An array keeps every element intact.

<<< ../../examples/bash/robust/arrays-and-getopts.sh

| Pattern | Why |
| --- | --- |
| `cmd_args=(--flag "value with spaces")`, then `cmd "${cmd_args[@]}"` | each element stays one argument |
| `[[ $dry_run == 1 ]] && args+=(--dry-run)` | conditional flags without string surgery |
| `mapfile -t lines < <(cmd)` | read output into an array without a subshell loop |
| `"${!assoc[@]}"` | iterate the keys of an associative array |
| `shift $(( OPTIND - 1 ))` | after `getopts`, leaves only the operands in `"$@"` |

`getopts` handles short options only. For long options (`--verbose`), loop over
`"$@"` with a `case` and `shift`, or use `getopt(1)` - but short options plus a
clear `usage` is usually the better trade.

## Validate before you act

Check everything up front and fail with a specific message. A script that dies
halfway through because of a typo in argument one has already done damage.

```bash
[[ -d "$source_dir" ]]     || die "not a directory: ${source_dir}"
[[ "$keep" =~ ^[0-9]+$ ]]  || die_usage "-k expects a number, got: ${keep}"
command -v rsync >/dev/null || die "rsync is required but not installed"
(( EUID == 0 ))            || die "must be run as root"
```

Related habits with an outsized payoff:

- **Write to a temporary file, then `mv` it into place.** A rename within one
  filesystem is atomic, so an interrupted run never leaves a half-written file
  that looks complete.
- **Verify what you produced** (`tar --test`, a checksum, a re-read) before
  deleting the source.
- **Support `-n`/dry-run** for anything destructive, and print the exact command
  it would have run.
- **Never `cd` without checking**: `cd "$dir" || die "cannot cd to ${dir}"` -
  otherwise the rest of the script runs in the wrong directory.
- **Quote and `--`**: `rm -f -- "$file"` survives filenames starting with `-`.

## A complete script

Everything above, in a script shaped like one you would actually schedule:

<<< ../../examples/bash/real-world/backup.sh

Note the division of streams: the log lines go to stderr, and the **only** thing
on stdout is the path of the artifact it produced - so
`archive="$(backup.sh /srv /backups)"` works, and the logs still reach the
terminal or the cron log.

## Verifying scripts the way you verify code

```bash
bash -n script.sh          # parse without executing
shellcheck script.sh       # the linter - catches unquoted vars, useless cat, [ vs [[, ...
shfmt -d -i 2 script.sh    # formatting diff
bats test/script.bats      # a real test framework for bash, if the script earns it
```

This repository runs the first two over every example on these pages via
`npm run check:bash`, for the same reason the TypeScript examples are
type-checked: documentation that is not executed drifts.

::: tip When to stop writing bash
Bash is excellent glue for "run these commands in this order". Once a script
needs data structures beyond flat arrays, floating-point arithmetic, structured
error handling, concurrency, or unit tests, it has outgrown the shell - rewrite
it in Python or Go while it is still 200 lines.
:::

## Summary

- Start with `set -euo pipefail` and `IFS=$'\n\t'`; state the failures you
  expect with `|| true`, `if !`, or an explicit `$?` capture.
- One `trap ... EXIT` handler owns cleanup; `mktemp` for temp paths, `flock` for
  locks.
- Build commands with **arrays**, parse options with **`getopts`**, and
  `shift $(( OPTIND - 1 ))`.
- Validate every input up front with a specific error; `die_usage` (64) and
  `die` (1) are different outcomes.
- Write to a temp file, verify, then `mv` atomically into place.
- stdout is the result, stderr is the log.
- Lint with `shellcheck`, and know when the job has outgrown bash.
