# Bash Scripting Basics

A shell script is just the commands you would type, saved in a file. That is its
strength and its trap: the shell was designed to be forgiving at a prompt, and
the same forgiveness turns into silent data loss in an unattended script.

## Anatomy of a script

```bash
#!/usr/bin/env bash        # the shebang: which interpreter runs this file
set -euo pipefail          # fail loudly (see the next page)

main() {
  echo "hello"
}

main "$@"                  # pass the script's arguments through
```

Make it executable and run it:

```bash
chmod +x script.sh
./script.sh                # requires the executable bit and the shebang
bash script.sh             # runs it regardless of either
source script.sh           # runs it in the CURRENT shell - it can change your environment
```

| Shebang | Meaning |
| --- | --- |
| `#!/usr/bin/env bash` | first `bash` on `PATH` - portable, the default choice |
| `#!/bin/bash` | that exact path - fine on Linux, wrong on systems where bash lives elsewhere |
| `#!/bin/sh` | POSIX shell. On Debian/Ubuntu this is **dash**, not bash: no arrays, no `[[ ]]`, no `local` |

If you write `#!/bin/sh`, you have promised not to use bash features. If you
want them, say `bash`.

## Variables, expansion, and quoting

Quoting is the single largest source of shell bugs. The rule fits on one line:
**quote every expansion unless you have a specific reason not to.**

<<< ../../examples/bash/basics/variables-and-quoting.sh

The parameter-expansion forms in that file replace whole subprocesses:

| Expansion | Result |
| --- | --- |
| `${VAR:-default}` | `default` if `VAR` is unset or empty (leaves `VAR` alone) |
| `${VAR:=default}` | same, and assigns it |
| `${VAR:?message}` | abort with `message` if unset or empty |
| `${VAR:+alt}` | `alt` only if `VAR` **is** set - handy for optional flags |
| `${#VAR}` | length |
| `${VAR#pat}` / `${VAR##pat}` | strip shortest / longest match from the **front** |
| `${VAR%pat}` / `${VAR%%pat}` | strip shortest / longest match from the **end** |
| `${VAR/old/new}` / `${VAR//old/new}` | replace first / all |
| `${VAR^^}` / `${VAR,,}` | upper / lower case (bash 4+) |

`${path##*/}` is `basename` and `${path%/*}` is `dirname`, without forking a
process - meaningful inside a loop over thousands of files.

## Conditionals and loops

`if` does not test a boolean expression; it runs a **command** and branches on
its exit status, where `0` means success.

<<< ../../examples/bash/basics/conditionals-and-loops.sh

### `[[ ]]` vs `[ ]` vs `(( ))`

| Form | Use |
| --- | --- |
| `[[ ... ]]` | bash's test keyword: no word splitting inside, supports `&&`, `\|\|`, `==` globbing, and `=~` regex. **The default choice.** |
| `[ ... ]` | the POSIX `test` command. Needed only in `#!/bin/sh` scripts; every expansion must be quoted |
| `(( ... ))` | arithmetic: `(( count > 5 ))`, `(( i++ ))`. Bare variable names, no `$` needed |

Common tests: `-f` file, `-d` directory, `-e` exists, `-L` symlink, `-r`/`-w`/`-x`
permission, `-s` non-empty file, `-z`/`-n` empty/non-empty string, `-eq`/`-ne`/
`-gt`/`-lt` numeric comparison, `==`/`!=`/`<` string comparison.

### Loops

- `for x in a b c` - a fixed list.
- `for f in *.log` - a **glob**, never `$(ls)`: only a glob survives spaces and
  newlines in filenames.
- `for i in {1..10}` / `for ((i=0; i<10; i++))` - ranges.
- `while IFS= read -r line; do ...; done < file` - line by line. `IFS=` keeps
  leading whitespace, `-r` stops backslash mangling.
- `until cmd; do ...; done` - retry until something starts succeeding.

::: warning A loop after a pipe runs in a subshell
`find . | while read -r f; do (( n++ )); done` leaves `n` unchanged: the loop
ran in a subshell that then exited. Feed it with process substitution instead -
`while read -r f; do ...; done < <(find .)` - so the loop stays in the current
shell.
:::

## Functions, arguments, and exit codes

<<< ../../examples/bash/basics/functions-and-arguments.sh

The conventions in that script are worth adopting wholesale:

- **`local` for every variable in a function.** Shell variables are global by
  default, so an unlocalised `i` in a helper will clobber the caller's `i`.
- **Return a status with `return`, return a value by echoing it** and capturing
  with `$(...)`. A function's status is the status of its last command.
- **Usage and errors go to stderr** (`>&2`), so stdout stays usable in a pipe.
- **`"$@"` (quoted) preserves argument boundaries**; `$*` joins everything into
  one word and `$@` unquoted re-splits on whitespace.
- **`shift`** consumes `$1` and renumbers the rest - the basis of manual
  argument parsing.

### Exit codes are your API

| Code | Convention |
| --- | --- |
| `0` | success - the only one with a universal meaning |
| `1` | general failure |
| `2` | shell builtin misuse |
| `64`–`78` | `sysexits.h` conventions; `64` = usage error is widely recognised |
| `126` / `127` | found but not executable / command not found |
| `130` / `143` | killed by SIGINT (128+2) / SIGTERM (128+15) |

`$?` holds the last command's status - capture it immediately, because the next
command overwrites it.

## Debugging

```bash
bash -n script.sh        # syntax check without running anything
bash -x script.sh        # print every command after expansion, as it runs
set -x; ...; set +x      # trace just one section
PS4='+ ${BASH_SOURCE}:${LINENO}: '   # add file and line to the -x output
```

`set -x` shows the command *after* expansion, which is exactly what you need
when quoting is the suspect. And run everything through
[shellcheck](https://www.shellcheck.net) - it catches the unquoted-variable and
`$(ls)` classes of bug before they ever run.

## Summary

- `#!/usr/bin/env bash`, `chmod +x`, `main "$@"`.
- **Quote every expansion.** `"$var"`, `"$@"`, `"${arr[@]}"`.
- Parameter expansion (`${v:-default}`, `${v##*/}`, `${v%.ext}`) replaces whole
  subprocesses.
- `if` branches on **exit status**; prefer `[[ ]]` for tests and `(( ))` for
  arithmetic.
- Loop over globs and `< <(...)`, never over `$(ls)` or through a pipe.
- `local` everything in functions, send diagnostics to stderr, and exit with a
  meaningful code.
- Debug with `bash -x`, and lint with `shellcheck`.
