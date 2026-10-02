#!/usr/bin/env bash
# check-bash: run
# Undoing changes at every stage: working tree, index, commits - and recovery.
set -euo pipefail

sandbox="$(mktemp -d)"
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com"
export GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
# Fixed timestamps make every commit hash reproducible, so the output below is exact.
export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$sandbox"

git init -q -b main notes && cd notes
echo "v1" > notes.txt && git add notes.txt && git commit -q -m "v1"
echo "v2" > notes.txt && git commit -q -am "v2"

# region restore
# Discard an unstaged edit: put the file back to what the index has.
echo "oops" > notes.txt
git restore notes.txt
[[ "$(cat notes.txt)" == v2 ]] || fail "restore working tree"

# Unstage, but keep the edit in the working tree.
echo "v3 draft" > notes.txt
git add notes.txt
git restore --staged notes.txt
[[ "$(git diff --staged --name-only)" == "" ]] || fail "nothing staged"
[[ "$(cat notes.txt)" == "v3 draft" ]] || fail "edit kept"
git restore notes.txt
# endregion restore

# region amend
echo "v3" > notes.txt && git commit -q -am "v3 (typo in mesage)"
# Fix the last commit's message (or add a forgotten file) - only before pushing.
git commit -q --amend -m "v3"
[[ "$(git log -1 --format=%s)" == v3 ]] || fail "amended message"
# endregion amend

# region reset
# --soft: move the branch back, keep the changes STAGED (redo the commit).
git reset -q --soft HEAD~1
[[ "$(git log -1 --format=%s)" == v2 ]] || fail "soft reset moved branch"
[[ "$(git diff --staged --name-only)" == notes.txt ]] || fail "changes still staged"
git commit -q -m "v3"

# --mixed (the default): move back, keep the changes UNSTAGED.
git reset -q HEAD~1
[[ "$(git status --short)" == " M notes.txt" ]] || fail "changes unstaged"
git commit -q -am "v3"

# --hard: move back and THROW AWAY the changes. The only reset that loses work.
git reset -q --hard HEAD~1
[[ "$(cat notes.txt)" == v2 ]] || fail "hard reset discards"
# endregion reset

# region reflog
# ...but the commit is not gone: the reflog records every position HEAD had.
git reflog -n 3 --format='  %gd %gs' 
lost="$(git rev-parse 'HEAD@{1}')"
[[ "$(git log -1 --format=%s "$lost")" == v3 ]] || fail "reflog finds the lost commit"
git reset -q --hard "$lost"
[[ "$(cat notes.txt)" == v3 ]] || fail "recovered"

# Same for a deleted branch: find its last commit in the reflog, recreate it.
git switch -q -c experiment
echo "idea" > idea.txt && git add idea.txt && git commit -q -m "Try an idea"
git switch -q main
git branch -q -D experiment
idea="$(git reflog --format='%H %gs' | awk '/commit: Try an idea/ { print $1; exit }')"
git branch experiment "$idea"
[[ "$(git show experiment:idea.txt)" == idea ]] || fail "deleted branch recovered"
# endregion reflog

# region revert
# On shared history, don't rewrite - add a commit that undoes another one.
echo "bad change" > notes.txt && git commit -q -am "Introduce bug"
git revert --no-edit HEAD >/dev/null
[[ "$(cat notes.txt)" == v3 ]] || fail "revert undid the change"
[[ "$(git log -1 --format=%s)" == 'Revert "Introduce bug"' ]] || fail "revert is a new commit"
git log --oneline -3 | sed 's/^/  /'
# endregion revert

echo "undoing-things: ok"
