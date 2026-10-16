#!/usr/bin/env bash
# check-bash: run
# Worktrees (several branches checked out at once) and cherry-picking single commits.
set -euo pipefail

sandbox="$(mktemp -d)"
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com"
export GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$sandbox"

commit_file() { # commit_file <file> <content> <message>
  printf '%s\n' "$2" > "$1"
  git add "$1"
  git commit -q -m "$3"
}

git init -q -b main app && cd app
commit_file app.txt "v1" "Release 1.0"
git branch release/1.x
commit_file feature.txt "half done" "WIP: new feature"

# region worktree
# An urgent fix for release/1.x, while main has uncommitted work you don't want to stash.
echo "more work" >> feature.txt

# A second working directory for another branch - same repository, same objects, no clone.
git worktree add -q ../app-hotfix release/1.x
(
  cd ../app-hotfix
  commit_file app.txt "v1.0.1" "Fix crash on empty input"
)
git worktree list | sed "s|$sandbox|  <sandbox>|; s/ [0-9a-f]\{7,\} / <sha> /"

# The work in progress on main was never touched:
[[ "$(git status --short)" == " M feature.txt" ]] || fail "main's edit untouched"
# Commits made in the worktree are on the branch, visible from every worktree.
[[ "$(git log -1 --format=%s release/1.x)" == "Fix crash on empty input" ]] || fail "hotfix committed"

git worktree remove ../app-hotfix  # refuses if the worktree has uncommitted changes
[[ ! -d ../app-hotfix ]] || fail "worktree removed"
# endregion worktree

# region cherry-pick
# The same fix is needed on main: copy that one commit, not the whole branch.
git stash -q
git cherry-pick -x release/1.x >/dev/null
git stash pop -q
[[ "$(cat app.txt)" == "v1.0.1" ]] || fail "fix applied on main"
# -x appends "(cherry picked from commit <sha>)", so the copy can be traced back.
git log -1 --format=%b | grep -q "cherry picked from commit $(git rev-parse release/1.x)" || fail "-x trailer"
# It is a NEW commit (different parent, different hash) with the same change.
[[ "$(git rev-parse HEAD)" != "$(git rev-parse release/1.x)" ]] || fail "new commit"
[[ "$(git diff release/1.x~1 release/1.x)" == "$(git diff HEAD~1 HEAD)" ]] || fail "same diff"
# endregion cherry-pick

echo "worktrees-and-cherry-pick: ok"
