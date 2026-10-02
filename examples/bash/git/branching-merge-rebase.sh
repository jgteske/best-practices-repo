#!/usr/bin/env bash
# check-bash: run
# Fast-forward merges, merge commits, rebasing, and resolving a conflict.
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

commit_file() { # commit_file <file> <content> <message>
  printf '%s\n' "$2" > "$1"
  git add "$1"
  git commit -q -m "$3"
}

git init -q -b main app && cd app
commit_file README.md "# App" "Initial commit"

# region fast-forward
git switch -q -c feature/login
commit_file login.txt "login form" "Add login form"
git switch -q main
# main has not moved since the branch was created: merging just moves the label.
git merge -q feature/login
[[ "$(git rev-list --count HEAD)" == 2 ]] || fail "no merge commit on fast-forward"
[[ "$(git rev-list --merges --count HEAD)" == 0 ]] || fail "still no merge commits"
# endregion fast-forward

# region merge-commit
git switch -q -c feature/search
commit_file search.txt "search box" "Add search box"
git switch -q main
commit_file footer.txt "footer" "Add footer"   # main moved on in the meantime
# Both sides have new commits: git records a merge commit with two parents.
git merge -q --no-edit feature/search
[[ "$(git rev-list --merges --count HEAD)" == 1 ]] || fail "one merge commit"
[[ "$(git rev-list --parents -n 1 HEAD | wc -w)" == 3 ]] || fail "merge commit has two parents"
git log --oneline --graph | sed 's/^/  /'
# endregion merge-commit

# region rebase
git switch -q -c feature/profile
commit_file profile.txt "profile page" "Add profile page"
git switch -q main
commit_file header.txt "header" "Add header"
git switch -q feature/profile
before="$(git rev-parse HEAD)"
# Replay this branch's commits on top of the current main: linear history.
git rebase -q main
[[ "$(git rev-parse HEAD~1)" == "$(git rev-parse main)" ]] || fail "branch now sits on main"
# The commit was RE-CREATED: same change, new hash. Never rebase commits others have pulled.
[[ "$(git rev-parse HEAD)" != "$before" ]] || fail "rebase rewrites commits"
git switch -q main && git merge -q --ff-only feature/profile
# -3, not `| head -3`: with pipefail, head closing the pipe early fails the script (SIGPIPE).
git log --oneline -3 | sed 's/^/  /'
# endregion rebase

# region conflict
git switch -q -c feature/title
commit_file README.md "# App (beta)" "Mark as beta"
git switch -q main
commit_file README.md "# The App" "Rename app"

if git merge -q feature/title >/dev/null 2>&1; then fail "expected a conflict"; fi
git status --short | sed 's/^/  /'        # UU = unmerged, both sides changed it
sed 's/^/  /' README.md                   # the conflict markers git wrote

# Resolve: write the version you want, stage it, and finish the merge.
printf '%s\n' "# The App (beta)" > README.md
git add README.md
git commit -q --no-edit
[[ "$(cat README.md)" == "# The App (beta)" ]] || fail "resolution committed"
[[ -z "$(git status --porcelain)" ]] || fail "clean tree after resolving"
# endregion conflict

echo "branching-merge-rebase: ok"
