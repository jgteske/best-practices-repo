# The Mental Model

Git commands are easier to predict once you know the four things Git actually
stores: **objects** (your content), **commits** (snapshots), **refs** (names
pointing at commits) and the **index** (the next commit, being assembled).

Example: [`mental-model.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/mental-model.sh).

## Objects: content addressed by hash

<<< ../../examples/bash/git/mental-model.sh#objects

```
  tree 0bd932055368eed778e9f8b4a6266bdd7916c4b8
  author Ada <ada@example.com> 1767268800 +0000
  committer Ada <ada@example.com> 1767268800 +0000

  Add fruit list
  100644 blob 950a188f0a4224ce6a1ac710915113df972aeb2c	fruit.txt
```

| Object | Holds |
| --- | --- |
| **blob** | the bytes of one file. No name and no permissions, just content |
| **tree** | a directory listing: names → blobs (files) and trees (subdirectories) |
| **commit** | one top-level tree, the parent commit(s), the author, the committer and the message |

Every object is named by the **hash of its content**. Identical files are stored
once, and changing anything (even one byte, or a commit's timestamp) produces a
different hash. That's why rewriting a commit always gives it a new identity.

## History: a chain of snapshots

<<< ../../examples/bash/git/mental-model.sh#history

A commit records the **whole project** as it was (through its tree), not a
diff. Diffs are computed on demand by comparing two snapshots. Each commit
points to its parent, so history is a chain you walk **backwards** from the
newest commit. `HEAD~1` means "one parent back", and `HEAD~3` means three.

## Branches and `HEAD` are pointers

<<< ../../examples/bash/git/mental-model.sh#refs

```
  * cb40537 (HEAD -> feature) Add plums
  * 22c921b (main) Add pears
  * 9238c2a Add fruit list
```

- A **branch** is a name that points at one commit, and nothing more. Creating a
  branch records one commit id. It doesn't copy any files.
- **`HEAD`** says which branch you're on. Committing creates a new commit whose
  parent is the current one, and moves **the current branch only** to it.
- **Detached `HEAD`** means `HEAD` points directly at a commit instead of a
  branch (after `git switch --detach <hash>` or checking out a tag). New commits
  made there belong to no branch. Create one (`git switch -c name`) before you
  leave, or find them later in the [reflog](./undoing-things#the-reflog-nothing-is-lost-for-a-while).

## The index: the next commit

<<< ../../examples/bash/git/mental-model.sh#index

```
  A  dairy.txt
   M fruit.txt
  100644 7c95f9a9836102046c3f2e33b88e3bf498a00ea5 0	dairy.txt
  100644 50977c746d6ae997e61d31e77a613f1111557e1d 0	fruit.txt
```

There are three versions of every file:

| Area | What it is | Compare with |
| --- | --- | --- |
| `HEAD` | the last commit | |
| the **index** (staging area) | what the next commit will contain | `git diff --staged` (index vs HEAD) |
| the **working tree** | the files on disk | `git diff` (working tree vs index) |

`git status --short` shows both comparisons side by side. The **left** column is
staged (index vs `HEAD`) and the **right** column is unstaged (working tree vs index).
`A ` is a new file that is staged. ` M` is modified but not staged. `MM` means some
of the changes are staged and more were made afterwards.

## Summary

- Git stores snapshots: blobs (content), trees (directories) and commits (snapshot + parents + metadata).
- Objects are named by their content hash, so any change to a commit gives it a new hash.
- A branch is a movable pointer. `HEAD` says which branch moves when you commit.
- The index is the next commit. `git diff` shows working tree vs index, and `git diff --staged` shows index vs `HEAD`.
