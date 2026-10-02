# Config, Ignore Files & Hooks

A few files and settings decide what a repository accepts: `.gitignore` keeps
junk and secrets out, `.gitattributes` keeps line endings sane across
operating systems, and hooks run checks before anything is committed.

Example: [`config-ignore-hooks.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/config-ignore-hooks.sh).

## `.gitignore`

<<< ../../examples/bash/git/config-ignore-hooks.sh#gitignore

```
  A  .env.example
  A  .gitignore
  A  src/app.ts
  .gitignore:6:.env.*	.env.local
```

| Pattern | Matches |
| --- | --- |
| `dist/` | a directory named `dist` anywhere (the trailing `/` means directories only) |
| `/dist/` | only `dist` at the repository root |
| `*.log` | any `.log` file in any directory |
| `**/tmp` | `tmp` at any depth |
| `!.env.example` | re-include something an earlier pattern excluded |

- Commit a `.gitignore` for **project** artefacts: dependencies, build output,
  local env files and coverage reports. GitHub's
  [gitignore templates](https://github.com/github/gitignore) are a good start.
- Put **personal** noise (`.DS_Store`, `.idea/`, `*.swp`) in your global ignore
  file (`core.excludesFile`, by default `~/.config/git/ignore`), not in every project.
- `git check-ignore -v <path>` tells you which rule ignores a file and on which line.

## Ignoring a file that is already tracked

<<< ../../examples/bash/git/config-ignore-hooks.sh#untrack

`.gitignore` only affects **untracked** files. For a file that was committed,
`git rm --cached` removes it from the index (and from the next commit) but leaves it
on disk.

::: danger A committed secret is a leaked secret
Untracking (or deleting) a file doesn't remove it from history. Anyone with
a clone can still read it. **Rotate the credential first.** Rewriting history
(`git filter-repo`) is a clean-up step afterwards, not a fix.
:::

## `.gitattributes`: line endings and binary files

<<< ../../examples/bash/git/config-ignore-hooks.sh#gitattributes

Without it, each developer's `core.autocrlf` setting decides line endings. Then
a Windows checkout turns a shell script into CRLF, and it fails with
`bad interpreter: /bin/bash^M`. `* text=auto eol=lf` normalises text files in
the repository and checks them out as LF on every OS. Exceptions such as `.bat`
files say so explicitly. Mark real binaries `binary`, so Git never tries to diff or
merge them as text.

## Configuration and aliases

<<< ../../examples/bash/git/config-ignore-hooks.sh#aliases

Settings live at three levels, and the most specific one wins: **`--system`**,
**`--global`** (`~/.gitconfig`, which is you) and **`--local`** (`.git/config`, this
repository). `git config --list --show-origin` shows where each value comes from.
Settings worth setting globally:

```bash
git config --global user.name "Ada Lovelace"
git config --global user.email "ada@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true          # rebase local commits on pull
git config --global fetch.prune true          # drop deleted remote branches on fetch
git config --global merge.conflictStyle zdiff3
git config --global rerere.enabled true       # remember conflict resolutions
```

## Hooks

<<< ../../examples/bash/git/config-ignore-hooks.sh#hooks

A hook is an executable in `.git/hooks/` that Git runs at a fixed point.
`pre-commit` runs before a commit is created, `commit-msg` can check the message,
and `pre-push` runs before a push. A non-zero exit stops the operation.

- **`.git/hooks` is not versioned.** To share hooks, commit them to a folder and
  point `git config core.hooksPath .githooks` at it, or use a manager:
  **husky** or **lefthook** in JavaScript projects, the **pre-commit** framework for
  Python and polyglot repos (see [Python tooling](/python/tooling)).
- Keep hooks **fast** (lint and format only the staged files) or people will skip
  them with `--no-verify`. Anything that must hold for every change belongs
  in **CI**. Hooks are an early warning, not a guarantee.

## Summary

- Ignore project artefacts in `.gitignore`, and personal noise in your global ignore file.
- `git rm --cached` untracks a file. A committed secret must be rotated.
- `* text=auto eol=lf` in `.gitattributes` ends line-ending fights.
- Share hooks through `core.hooksPath` or a hook manager, keep them fast, and enforce the rules in CI.
