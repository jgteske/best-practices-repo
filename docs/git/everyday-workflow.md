# The Everyday Workflow

The daily loop is short: look at what changed, stage the part that belongs
together, commit it with a message that explains why, and repeat. The habits on
this page are what make history useful later, when you're bisecting a bug or
reviewing a pull request.

Example: [`everyday-workflow.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/everyday-workflow.sh).

## Look before you commit

<<< ../../examples/bash/git/everyday-workflow.sh#inspect

```
   M post.md
   M style.css
   post.md   | 2 +-
   style.css | 2 +-
   2 files changed, 2 insertions(+), 2 deletions(-)
```

Run `git status` and `git diff` before every commit. `git diff --staged` shows
exactly what is about to be recorded. Reading it is the cheapest code review there is,
and it catches stray debug output and files you never meant to include.

## One logical change per commit

<<< ../../examples/bash/git/everyday-workflow.sh#stage-precisely

Two unrelated edits become two commits. Stage by path, or by **hunk** with
`git add -p`, which walks through each change and asks `y`/`n`/`s` (split).
Focused commits are easier to review, to revert (`git revert` undoes exactly
one idea) and to bisect.

::: warning `git add .` and `commit -a`
Both stage everything. That's fine when you've just read `git status`, but it's the
usual way `.env` files and 50 MB CSVs end up in history. A good
[`.gitignore`](./config-ignore-hooks#gitignore) is the safety net.
:::

## Write messages for the reader in a year

<<< ../../examples/bash/git/everyday-workflow.sh#commit-message

```
  7970a47 Cache rendered posts for five minutes
  f026b11 Switch text colour to navy
  8abfea2 Polish the first post's title
  b20948a Add first post
```

- **Subject**: the imperative mood ("Add", "Fix", "Remove", as in *"this commit
  will…"*), at most about 50 characters, and no trailing period. It's what
  `--oneline`, GitHub and `git shortlog` show.
- **Blank line, then a body** that explains **why**: the problem, the
  constraint, the trade-off. The diff already shows *what* changed.
- Teams that generate changelogs often use
  [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat: ...`, `fix: ...`). It's the same rules plus a type prefix.

## Park work with `stash`

<<< ../../examples/bash/git/everyday-workflow.sh#stash

`git stash` saves your uncommitted changes (staged and unstaged) and cleans the
working tree, so you can switch branches for an urgent fix. `git stash pop`
brings them back. Give stashes a message (`-m`) and don't let them pile up. For
anything that should last longer than an afternoon, a WIP commit on a branch is safer.

## Summary

- `status` and `diff` before every commit. `diff --staged` shows what will be recorded.
- Make one logical change per commit, and stage by path or with `git add -p`.
- Write the subject in the imperative, under 50 characters. Use the body to explain why.
- `stash -m` is for short interruptions. Use a branch for anything longer.
