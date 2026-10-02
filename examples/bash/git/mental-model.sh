#!/usr/bin/env bash
# check-bash: run
# Git's data model, inspected directly: blobs, trees, commits, refs and the index.
set -euo pipefail

# region sandbox
# Every git example runs in a throwaway directory, isolated from your own
# ~/.gitconfig, with a fixed identity - so it behaves the same on every machine.
sandbox="$(mktemp -d)"
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com"
export GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
# Fixed timestamps make every commit hash reproducible, so the output below is exact.
export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$sandbox"
# endregion sandbox

# region objects
git init -q -b main shop && cd shop
echo "apples" > fruit.txt
git add fruit.txt
git commit -q -m "Add fruit list"

commit="$(git rev-parse HEAD)"
tree="$(git rev-parse 'HEAD^{tree}')"
blob="$(git rev-parse HEAD:fruit.txt)"

# Three kinds of object, each named by the hash of its content.
[[ "$(git cat-file -t "$commit")" == commit ]] || fail "commit type"
[[ "$(git cat-file -t "$tree")" == tree ]] || fail "tree type"
[[ "$(git cat-file -t "$blob")" == blob ]] || fail "blob type"

# A commit is a small text object: its tree, its parents, author, message.
git cat-file -p "$commit" | sed 's/^/  /'
# A tree lists names -> blobs (files) and trees (directories).
git cat-file -p "$tree" | sed 's/^/  /'
# Same content, same hash: git stores identical files once.
[[ "$(echo "apples" | git hash-object --stdin)" == "$blob" ]] || fail "content addressing"
# endregion objects

# region history
echo "pears" >> fruit.txt
git commit -q -am "Add pears"
# Each commit points at its parent: history is a chain walked backwards from HEAD.
[[ "$(git rev-parse HEAD~1)" == "$commit" ]] || fail "parent link"
[[ "$(git rev-list --count HEAD)" == 2 ]] || fail "two commits"
# The first commit's blob is unchanged in the object store - commits are snapshots.
[[ "$(git show "$commit":fruit.txt)" == "apples" ]] || fail "old snapshot"
# endregion history

# region refs
# A branch is just a name that points at a commit. HEAD names the current branch.
[[ "$(git symbolic-ref HEAD)" == refs/heads/main ]] || fail "HEAD -> main"
git branch feature
[[ "$(git rev-parse feature)" == "$(git rev-parse main)" ]] || fail "new branch = same commit"
# Committing moves the CURRENT branch only.
git switch -q feature
echo "plums" >> fruit.txt
git commit -q -am "Add plums"
[[ "$(git rev-parse main)" == "$(git rev-parse feature~1)" ]] || fail "main stayed put"
git log --oneline --decorate --graph --all | sed 's/^/  /'
# endregion refs

# region index
# The index (staging area) is the NEXT commit being assembled.
echo "kiwis" >> fruit.txt
echo "milk" > dairy.txt
git add dairy.txt
git status --short | sed 's/^/  /'
# Left column = staged (index vs HEAD), right column = unstaged (working tree vs index).
[[ "$(git status --short)" == $'A  dairy.txt\n M fruit.txt' ]] || fail "status columns"
git ls-files --stage | sed 's/^/  /'
# endregion index

echo "mental-model: ok"
