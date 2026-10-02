# Branching, Merging & Rebasing

A branch costs nothing (it's [a pointer](./mental-model#branches-and-head-are-pointers)),
so use one for every piece of work. Bringing the work back is where the choices
are: a fast-forward, a merge commit, or a rebase.

Example: [`branching-merge-rebase.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/branching-merge-rebase.sh).

## Fast-forward: nothing to merge

<<< ../../examples/bash/git/branching-merge-rebase.sh#fast-forward

If `main` hasn't moved since the branch was created, there is nothing to
combine. Git simply moves the `main` pointer forward to the branch's commit and
creates no new commit. `git merge --ff-only` merges *only* in that case and
fails otherwise, which is a safe default for updating a local branch.

## Merge commit: both sides moved

<<< ../../examples/bash/git/branching-merge-rebase.sh#merge-commit

```
  *   a3d9397 Merge branch 'feature/search'
  |\
  | * 34768d4 Add search box
  * | 693ce7e Add footer
  |/
  * 509e89a Add login form
  * 128540c Initial commit
```

When both branches have new commits, `git merge` creates a commit with **two
parents** that joins them. History records exactly what happened, including
that the work happened in parallel.

## Rebase: replay on top

<<< ../../examples/bash/git/branching-merge-rebase.sh#rebase

```
  5ee67b2 Add profile page
  19ac8a0 Add header
  a3d9397 Merge branch 'feature/search'
```

`git rebase main` takes the commits that are on your branch but not on `main` and
**re-creates** them on top of `main`'s current tip. The result is a straight line,
so the follow-up merge is a fast-forward. The commits get **new hashes**, because their
parent changed and a commit's hash covers its parent.

::: danger The one rule of rebasing
Only rebase commits that **nobody else has based work on**: your local
commits, or your own feature branch before review. Rebasing a shared branch
rewrites commits other people have, and their next pull turns into a mess of
duplicates. If you must update a pushed branch, see
[`--force-with-lease`](./remotes-and-prs#rewriting-a-pushed-branch-force-with-lease).
:::

| | Merge commit | Rebase |
| --- | --- | --- |
| History | true and branching | linear and tidy |
| Existing commits | untouched | rewritten (new hashes) |
| Conflicts | resolved once, in the merge | resolved per replayed commit |
| Safe on shared branches | yes | no |

A common team setup: **rebase your own branch** on `main` to keep it current
(or `git pull --rebase`), and **merge** into `main` through a pull request. Many
teams use "squash and merge" there, which turns the whole branch into one commit on `main`.

## Resolving a conflict

<<< ../../examples/bash/git/branching-merge-rebase.sh#conflict

```
  UU README.md
  <<<<<<< HEAD
  # The App
  =======
  # App (beta)
  >>>>>>> feature/title
```

A conflict means both sides changed the same lines, and Git won't guess which
version is right. The process is always the same:

1. `git status` lists the conflicted files (`UU`).
2. Edit each file into the version you want and **delete the markers**. Often
   the right answer combines both sides, like `# The App (beta)` here.
3. `git add` the resolved files.
4. Finish with `git commit` (for a merge) or `git rebase --continue` (for a rebase).

`git merge --abort` / `git rebase --abort` gets you back to where you started.
`git config --global merge.conflictStyle zdiff3` adds the common ancestor's
version between the markers, which often makes the right resolution obvious.

## Summary

- Branch for every piece of work. It's just a pointer.
- Fast-forward when possible (`--ff-only`). A merge commit records parallel work.
- Rebase only your own unshared commits. It rewrites them.
- To resolve a conflict: edit, remove the markers, `git add`, then continue. `--abort` is always available.
