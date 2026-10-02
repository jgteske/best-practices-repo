# Undoing Things

Almost every Git mistake can be undone, and the right command depends on
**where** the mistake is: in the working tree, in the index, in a local commit,
or in a commit that's already pushed.

Example: [`undoing-things.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/undoing-things.sh).

| You want to... | Command |
| --- | --- |
| discard an unstaged edit | `git restore <file>` |
| unstage (keep the edit) | `git restore --staged <file>` |
| fix the last commit's message or content | `git commit --amend` |
| undo commits, keep the changes staged | `git reset --soft HEAD~1` |
| undo commits, keep the changes unstaged | `git reset HEAD~1` |
| undo commits and **discard** the changes | `git reset --hard HEAD~1` |
| find a commit you "lost" | `git reflog` |
| undo a commit that is already pushed | `git revert <commit>` |

## Working tree and index: `restore`

<<< ../../examples/bash/git/undoing-things.sh#restore

`git restore` (Git 2.23+) took over the file-level jobs of the old, overloaded
`git checkout`. Without flags it copies the index version over your working
file, which **discards** your edit for good, because uncommitted work isn't in the
reflog. With `--staged` it copies the `HEAD` version into the index, so the file is unstaged
and the edit stays.

## The last commit: `--amend`

<<< ../../examples/bash/git/undoing-things.sh#amend

`--amend` replaces the last commit with a new one: a new message, or extra files
you `git add`ed first. It's a rewrite (new hash), so only amend commits you
haven't pushed.

## Moving the branch back: `reset`

<<< ../../examples/bash/git/undoing-things.sh#reset

`git reset <commit>` moves the current branch pointer. The mode decides what
happens to the changes from the commits you "removed":

| Mode | Branch | Index | Working tree |
| --- | --- | --- | --- |
| `--soft` | moved | kept (changes staged) | kept |
| `--mixed` (default) | moved | reset (changes unstaged) | kept |
| `--hard` | moved | reset | **reset: uncommitted changes are lost** |

`--soft` is how you squash your last few commits into one (`reset --soft HEAD~3`,
then commit). `--hard` is the only one that destroys work, so run `git status`
first.

## The reflog: nothing is lost (for a while)

<<< ../../examples/bash/git/undoing-things.sh#reflog

```
  HEAD@{0} reset: moving to HEAD~1
  HEAD@{1} commit: v3
  HEAD@{2} reset: moving to HEAD~1
```

Every time `HEAD` moves (commit, reset, rebase, switch), Git records the
previous position in the **reflog**. A commit that no branch points to anymore is
still in the object store, and `HEAD@{n}` finds it. That rescues a bad
`reset --hard`, a botched rebase (`git reset --hard ORIG_HEAD` or a reflog
entry), and deleted branches.

The reflog is **local** and expires (unreachable entries after 30 days by
default). It can't recover changes that were never committed. That's another
reason to commit early on a branch.

## Shared history: `revert`

<<< ../../examples/bash/git/undoing-things.sh#revert

```
  cb18341 Revert "Introduce bug"
  8b05b58 Introduce bug
  7302c96 v3
```

Once a commit is pushed and others may have it, don't rewrite it. `git revert`
adds a **new** commit that applies the inverse change. History stays intact, and
everyone simply pulls the fix. To revert a merge commit, choose which parent to
keep: `git revert -m 1 <merge>`.

## Summary

- Use `restore` for files, `restore --staged` to unstage, and `--amend` for the last unpushed commit.
- `reset --soft`, `--mixed` and `--hard` all move the branch. Only `--hard` discards work.
- The reflog finds "lost" commits and deleted branches, but not uncommitted changes.
- Pushed commits get `revert`ed, not rewritten.
