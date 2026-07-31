# Linux, Bash & the Terminal

A practical guide to living in a Linux shell: the commands you reach for every
day, what they actually do, how to combine them, and how to turn a sequence of
them into a script that is safe to put in cron.

Every shell script on these pages is a real, executable `.sh` file under
[`examples/bash`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash)
in this repository, imported directly into the page. `npm run check:bash`
parses each one with `bash -n` (and lints it with `shellcheck`, if installed),
so a snippet in the docs cannot silently rot - the same guarantee
`npm run typecheck` gives the TypeScript examples.

## What's covered

<div class="vp-doc">

**Using the shell**

| Page | Focus |
| --- | --- |
| [Shell Basics & Navigation](./shell-basics) | What the shell actually does, paths, moving around, history, tab completion, and how to read a man page. |
| [Files & Directories](./files-and-directories) | `ls` `cp` `mv` `rm` `mkdir` `ln`, globbing, `find`, archives with `tar`, and disk usage. |
| [Pipes, Redirection & Streams](./pipes-and-redirection) | stdin/stdout/stderr, `>` `>>` `2>&1`, pipes, `tee`, `xargs`, heredocs, and process substitution. |
| [Text Processing](./text-processing) | `grep` `sed` `awk` `sort` `uniq` `cut` `tr` `wc` `jq` - and when to stop chaining and write one `awk`. |

**The system**

| Page | Focus |
| --- | --- |
| [Permissions & Ownership](./permissions-and-ownership) | The `rwx` model, octal modes, `chmod` `chown` `umask`, `sudo`, and the special bits. |
| [Processes, Jobs & Signals](./processes-and-jobs) | `ps` `top` `kill`, foreground/background jobs, `nohup`, and what each signal means. |
| [System, Packages & Services](./system-and-packages) | `apt`/`dnf`, `systemctl`, `journalctl`, disk/memory/CPU inspection, and the filesystem layout. |
| [Networking & Remote Work](./networking-and-remote) | `ssh` keys and config, `scp`/`rsync`, `curl`, `ss`, `dig`, and port troubleshooting. |

**Scripting**

| Page | Focus |
| --- | --- |
| [Bash Scripting Basics](./scripting-basics) | Shebangs, variables, the quoting rules, conditionals, loops, functions, arguments, and exit codes. |
| [Writing Robust Scripts](./scripting-robustness) | `set -euo pipefail`, `trap` cleanup, `mktemp`, arrays, `getopts`, locking, and a full production-shaped script. |

**Reference**

| Page | Focus |
| --- | --- |
| [Command Cheat Sheet](./cheatsheet) | One-line reminders for everything above, grouped by task. |

</div>

## Conventions used on these pages

- `$` at the start of a line means "type this as a normal user"; `#` means root.
  Neither is part of the command.
- `UPPERCASE` in a synopsis is a placeholder you replace; `[brackets]` mean
  optional; `...` means "repeatable".
- Examples assume **bash 4.4+** on a mainstream distribution (Debian/Ubuntu,
  Fedora/RHEL, Arch) with **GNU coreutils**. macOS ships BSD versions of many
  tools whose flags differ - `brew install coreutils` gives you the GNU ones as
  `gls`, `gsed`, and so on.

## Three ways to find out what a command does

```bash
man ls              # the full manual: / to search, n/N to jump, q to quit
ls --help           # the short version, and often all a modern tool has
type -a ls          # is it a binary, a shell builtin, a function, or an alias?
```

`man` sections matter when a name exists in more than one: `man 1 printf` is the
command, `man 3 printf` is the C function. `apropos keyword` searches the man
page descriptions when you don't know the name yet.

::: tip Learn `tldr`
`tldr COMMAND` (from the [tldr-pages](https://tldr.sh) project) prints a handful
of real examples instead of an exhaustive manual - usually what you actually
wanted. `man` remains the authority when the examples aren't enough.
:::

::: warning Commands that do not ask twice
`rm -rf`, `dd`, `mkfs`, `> file`, and `chmod -R` have no undo and no
recycle bin. Before running one with a variable in it, echo it first:
`echo rm -rf "${dir}/"` shows you what would happen. The
[scripting robustness](./scripting-robustness) page covers the habits that stop
an empty variable from turning `"${dir}/"` into `/`.
:::
