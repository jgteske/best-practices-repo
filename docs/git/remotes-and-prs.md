# Remotes & Pull Requests

A remote is another copy of the repository, usually on GitHub or GitLab.
`git push` and `git fetch` copy commits between the copies. Everything else
(remote-tracking branches, upstreams, pull requests) is bookkeeping around those two.

Example: [`remotes.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git/remotes.sh).
It uses a local bare repository as `origin` and two clones, `ada` and `bob`, as two developers.

## Clone, push, upstream

<<< ../../examples/bash/git/remotes.sh#setup

- A **bare** repository has no working tree, only the `.git` contents. That's what a
  hosting service stores.
- `origin` is just the default name of the remote you cloned from.
- `push -u origin main` pushes and sets **`origin/main` as the upstream** of
  your `main`. After that, plain `git push`, `git pull` and `git status` know
  which remote branch to compare with.

## `fetch` vs `pull`

<<< ../../examples/bash/git/remotes.sh#fetch-vs-pull

```
  ## main...origin/main [behind 1]
```

- `git fetch` downloads new commits and moves the **remote-tracking branches**
  (`origin/main`). It never touches your branches or your files, so it's always safe.
- `git pull` is `fetch` followed by merging (or rebasing) the upstream into the
  current branch.
- `git status` compares against `origin/main` **as of the last fetch**. Fetch first
  if you want a real answer to "am I up to date?".

## Diverged: rejected push and `pull --rebase`

<<< ../../examples/bash/git/remotes.sh#diverged

```
  dcf814d Ada's second change
  f7be78c Bob's second change
  22807de Bob's change
  db8b081 v1
```

A push is rejected when the remote has commits you don't have. Git won't
overwrite them. `git pull --rebase` fetches them and replays your local commits on
top, and then the push is a fast-forward. Make it the default with
`git config --global pull.rebase true`. Rebasing here is safe because the commits
being rewritten are your own **unpushed** ones.

## Rewriting a pushed branch: `--force-with-lease`

<<< ../../examples/bash/git/remotes.sh#force-with-lease

After amending or rebasing a branch you have already pushed, a normal push is
rejected and you need a force push. **`--force` overwrites whatever is on the remote**,
including commits a teammate pushed a minute ago.
**`--force-with-lease`** only overwrites the remote branch if it still points
where your `origin/feature` says it does, so here it refuses and Bob's commit
survives. To recover, fetch, rebase onto what they pushed and push again.

::: tip Make it the habit
`git config --global alias.pushf "push --force-with-lease"`. Never type a
bare `--force` on a shared branch, and protect `main` on the server so that
nobody can force-push to it.
:::

## A pull-request workflow

1. **Update `main`**: `git switch main && git pull --ff-only`.
2. **Branch**: `git switch -c feat/search-filters`. Keep one topic per branch,
   and keep it small enough to review in one sitting.
3. **Commit** [focused changes](./everyday-workflow#one-logical-change-per-commit),
   then `git push -u origin feat/search-filters`, and open the PR.
4. **Stay current**: `git fetch && git rebase origin/main` (then
   `push --force-with-lease`), or merge `main` in if the team prefers.
5. **Address review** with new commits, so reviewers can see what changed. Squash at the end if the
   team squash-merges anyway.
6. **After merging**: delete the branch (`git push origin --delete <branch>`,
   or let the host do it), then `git fetch --prune` to drop stale
   remote-tracking branches.

## Summary

- `fetch` is always safe. `pull` = `fetch` + integrate. `status` is only as fresh as your last fetch.
- `push -u` sets the upstream once. A rejected push means "integrate first" (`pull --rebase`).
- Force-push only your own branches, and always with `--force-with-lease`.
- Use small, single-topic branches. Rebase or merge `main` into them, and merge through a PR.
