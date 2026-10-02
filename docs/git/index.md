# Git & Collaboration

Git is easy to use from a list of memorised commands, right up until something
goes wrong. This guide starts from the **model** (snapshots, pointers and the
staging area), because almost every confusing Git situation makes sense once you know
what a branch, `HEAD` and the index actually are. From there it covers the daily
loop, branching, undoing mistakes, working with remotes and pull requests, and
configuring a repository.

Every example on these pages is a real script under
[`examples/bash/git`](https://github.com/jgteske/best-practices-repo/tree/main/examples/bash/git).
`npm run check:bash` doesn't just lint them, it **runs** them. Each one builds
throwaway repositories in a temporary directory and checks every claim with an
assertion. Commit timestamps are pinned, so the hashes in the quoted output are
exactly what the scripts print.

<<< ../../examples/bash/git/mental-model.sh#sandbox

## What's covered

<div class="vp-doc">

| Page | Focus |
| --- | --- |
| [The Mental Model](./mental-model) | Blobs, trees and commits, history as a chain of snapshots, branches and `HEAD` as pointers, and the index. |
| [The Everyday Workflow](./everyday-workflow) | `status` and `diff`, staging precisely, focused commits, writing commit messages, and `stash`. |
| [Branching, Merging & Rebasing](./branching-merge-rebase) | Fast-forward vs merge commits, rebasing onto `main`, resolving a conflict, and when to use each. |
| [Undoing Things](./undoing-things) | `restore`, `--amend`, the three `reset` modes, recovering "lost" commits from the reflog, and `revert` for shared history. |
| [Remotes & Pull Requests](./remotes-and-prs) | `fetch` vs `pull`, upstreams, rejected pushes and `pull --rebase`, `--force-with-lease`, and a pull-request workflow. |
| [Config, Ignore Files & Hooks](./config-ignore-hooks) | `.gitignore` and untracking files, `.gitattributes` and line endings, aliases, and hooks. |
| [Cheat Sheet](./cheatsheet) | One-line reminders grouped by task. |

</div>
