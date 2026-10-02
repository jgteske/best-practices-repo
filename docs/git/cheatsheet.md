# Git Cheat Sheet

One-line reminders, grouped by the question you're trying to answer. Each
section links to the page with the full explanation.

## What's going on? [details](./mental-model)

```bash
git status -sb                      # short status + branch vs upstream
git diff                            # working tree vs index (unstaged)
git diff --staged                   # index vs HEAD (what will be committed)
git log --oneline --graph --decorate --all
git show <commit>                   # one commit's message and diff
git blame -w <file>                 # who last changed each line (ignore whitespace)
```

## Commit: [details](./everyday-workflow)

```bash
git add <path> ; git add -p         # stage a file / stage hunk by hunk
git commit -m "Imperative subject"  # add a body with plain `git commit`
git commit --amend --no-edit        # add staged changes to the last commit (unpushed)
git stash push -m "msg" ; git stash list ; git stash pop
```

## Branch & integrate: [details](./branching-merge-rebase)

```bash
git switch -c feat/x                # create and switch
git switch main ; git switch -      # switch / switch back
git merge --ff-only feat/x          # only if no merge commit is needed
git merge feat/x                    # merge commit if both sides moved
git rebase main                     # replay this branch on main (unshared commits only)
git merge --abort ; git rebase --abort ; git rebase --continue
git branch -d feat/x                # delete merged branch (-D: force)
```

## Undo: [details](./undoing-things)

```bash
git restore <file>                  # discard unstaged edit
git restore --staged <file>         # unstage
git reset --soft HEAD~1             # undo commit, keep changes staged
git reset HEAD~1                    # undo commit, keep changes unstaged
git reset --hard HEAD~1             # undo commit AND discard changes
git reflog ; git reset --hard HEAD@{1}   # find and return to a previous position
git revert <commit>                 # undo a pushed commit with a new commit
```

## Remotes: [details](./remotes-and-prs)

```bash
git fetch --prune                   # download; never touches your branches
git pull --rebase                   # fetch + replay local commits on top
git push -u origin <branch>         # first push: set upstream
git push --force-with-lease         # after rewriting YOUR branch
git push origin --delete <branch>
```

## Repository setup: [details](./config-ignore-hooks)

```bash
git check-ignore -v <path>          # which rule ignores this file?
git rm --cached <file>              # stop tracking, keep on disk
git check-attr -a <path>            # effective .gitattributes
git config --list --show-origin     # every setting and where it comes from
git config core.hooksPath .githooks # versioned hooks
```
