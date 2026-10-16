# Power Tools

These are the Git commands people learn after their first bad week: a hotfix
needed while you're mid-feature, a bug that appeared "somewhere in the last 200
commits", review feedback on the third commit of five, a stack of dependent
branches, and the same merge conflict for the fourth time. Each one has a tool
built in.

Every snippet is a region of a script under
[`examples/bash/git`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git).
`npm run check:bash` runs each script in a throwaway repository and asserts
the outcome.

## Worktrees: two branches checked out at once

<<< ../../examples/bash/git/worktrees-and-cherry-pick.sh#worktree

```
  <sandbox>/app         <sha> [main]
  <sandbox>/app-hotfix  <sha> [release/1.x]
```

`git worktree add <path> <branch>` creates a second working directory attached
to the **same repository**. Objects, branches, stashes and config are shared,
and only the checked-out files and the index are separate. Compared with the
alternatives:

- **vs. `git stash`:** nothing in your current directory moves, including
  untracked files, build output and your editor's open buffers.
- **vs. a second clone:** no second download and no fetching to keep the two
  in sync. A commit made in one worktree is immediately visible in the other.

One rule applies: a branch can be checked out in only one worktree at a time.
Remove a worktree with `git worktree remove` (it refuses if there are
uncommitted changes), and run `git worktree prune` if you deleted the
directory by hand. Worktrees also suit long builds and test runs on another
branch, reviewing a PR without disturbing your work, and running several
coding agents side by side.

## Cherry-pick: copy one commit

<<< ../../examples/bash/git/worktrees-and-cherry-pick.sh#cherry-pick

`git cherry-pick <commit>` applies that commit's **diff** on top of your
current branch as a new commit, with a new parent and a new hash. Use it to
backport or forward-port a fix between long-lived branches. `-x` records
where the copy came from in its message, which is what makes "is this fix on
the release branch?" answerable later. A range works too:
`git cherry-pick A..B` (A excluded).

Don't use cherry-pick to sync two branches that will be merged later. Both
copies of the change end up in history, and the merge may conflict with
itself. Merge or rebase instead.

## `bisect run`: let a script find the bad commit

<<< ../../examples/bash/git/bisect-run.sh#history

<<< ../../examples/bash/git/bisect-run.sh#test-script

<<< ../../examples/bash/git/bisect-run.sh#bisect

```
  first bad commit: Change 21
  test runs: 5
```

`git bisect` binary-searches the range between a known-good and a known-bad
commit. With `bisect run`, a script judges each step instead of you, so the
search runs unattended: 32 commits in 5 test runs, 1,000 commits in about 10.
The exit code is the protocol:

| Exit code | Means |
| --- | --- |
| `0` | good |
| `1`-`127` (except 125) | bad |
| `125` | can't test this commit (doesn't build). Skip it |
| `128`+ | abort the bisect |

Bisect works only as well as the history allows. If each commit builds and
passes its tests (see [Everyday Workflow](./everyday-workflow)), bisect points
at one small change. If the history is full of "WIP" commits that don't build,
you end up skipping half the steps. `git bisect log` shows what has been
decided so far, and `git bisect reset` always takes you back.

## Fixup commits and `--autosquash`

<<< ../../examples/bash/git/autosquash-and-rerere.sh#fixup

```
  fixup! Add cart total
  Expose the cart over HTTP
  Add cart total
```

<<< ../../examples/bash/git/autosquash-and-rerere.sh#autosquash

```
  Expose the cart over HTTP
  Add cart total
```

When review feedback is about an **earlier** commit in your branch, commit the
change with `--fixup=<commit>` (`:/text` finds the newest commit whose message
matches). `rebase -i --autosquash` then reorders the todo list so each
`fixup!` follows its target and is melded into it. You only have to save the
list. (The script sets `GIT_SEQUENCE_EDITOR=:` to accept it automatically.) A
reviewer sees a branch where each commit is complete, not "Add cart total"
followed by "fix review comments".

Variants: `--fixup=amend:<commit>` also replaces the message, and
`--squash=<commit>` lets you edit the combined message. Like any rebase, use
this only on commits you haven't shared, or on your own PR branch before merge
(see [Branching, Merging & Rebasing](./branching-merge-rebase)).

## `--update-refs`: rebase a stack of branches at once

<<< ../../examples/bash/git/autosquash-and-rerere.sh#update-refs

```
  Add POST /cart (feature/api)
  Expose the cart over HTTP (feature/cart)
  Add cart total
```

With stacked branches (`feature/api` built on `feature/cart`), rewriting the
lower branch normally leaves the upper one pointing at the **old** commits,
and you rebase each one by hand. `--update-refs` (Git 2.38+) moves every
branch that points into the rebased range along with it. Set
`rebase.updateRefs=true` to make it the default.

## rerere: resolve a conflict once

<<< ../../examples/bash/git/autosquash-and-rerere.sh#rerere

`rerere` ("reuse recorded resolution") records the conflicted hunks and your
resolution of them. The next time the **same** conflict appears, in a repeated
rebase, a re-merge after a revert, or a long-running branch you keep updating,
git writes your earlier resolution into the file. Git still treats the file as
conflicted until you `git add` it, so you get to review the result first.
`rerere.autoUpdate=true` stages it automatically. `git rerere forget <path>`
discards a bad recorded resolution.

## Summary

| Problem | Tool |
| --- | --- |
| Need another branch without disturbing this one | `git worktree add ../dir branch` |
| One fix needed on another long-lived branch | `git cherry-pick -x <commit>` |
| "It worked last month" | `git bisect start BAD GOOD && git bisect run ./test.sh` |
| Review feedback on an earlier commit | `git commit --fixup=<commit>` + `git rebase -i --autosquash` |
| Stacked branches | `git rebase --update-refs` |
| The same conflict again and again | `git config rerere.enabled true` |
