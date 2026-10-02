#!/usr/bin/env bash
# check-bash: run
# Remotes without a server: a bare repository plays "origin" for two clones.
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

# region setup
git init -q --bare -b main origin.git          # what GitHub/GitLab host for you
git clone -q origin.git ada 2>/dev/null        # (warns that the remote is empty)
cd ada
echo "v1" > app.txt && git add app.txt && git commit -q -m "v1"
# -u records origin/main as this branch's upstream, so later `git push`/`git pull` need no arguments.
git push -q -u origin main
cd .. && git clone -q origin.git bob
# endregion setup

# region fetch-vs-pull
cd bob && echo "bob's change" > bob.txt && git add bob.txt && git commit -q -m "Bob's change" && git push -q && cd ..
cd ada
git fetch -q              # download only: origin/main moves, your main does not
git status --short --branch | sed -n '1s/^/  /p'
[[ "$(git rev-list --count main..origin/main)" == 1 ]] || fail "one commit behind"
[[ ! -f bob.txt ]] || fail "fetch does not touch the working tree"
git merge -q --ff-only    # fetch + merge is what `git pull` does
[[ -f bob.txt ]] || fail "merged"
# endregion fetch-vs-pull

# region diverged
# Both sides commit: a plain pull would create a merge commit. --rebase replays
# your local commits on top instead, keeping history linear.
echo "ada 2" > ada.txt && git add ada.txt && git commit -q -m "Ada's second change"
(cd ../bob && git pull -q && echo "bob 2" >> bob.txt && git commit -q -am "Bob's second change" && git push -q)
if git push -q 2>/dev/null; then fail "push must be rejected: the remote has commits we don't"; fi
git pull -q --rebase
git push -q
[[ "$(git rev-list --merges --count HEAD)" == 0 ]] || fail "linear history"
git log --oneline | sed 's/^/  /'
# endregion diverged

# region force-with-lease
# Rewriting a pushed branch (e.g. after an interactive rebase) needs a force push.
git switch -q -c feature
echo "wip" > feature.txt && git add feature.txt && git commit -q -m "wip"
git push -q -u origin feature
git commit -q --amend -m "Add feature"
# A teammate pushes to the same branch in the meantime...
(cd ../bob && git fetch -q && git switch -q feature && echo "fix" >> feature.txt && git commit -q -am "Fix" && git push -q)
# --force-with-lease refuses because origin/feature is not what we last saw.
if git push -q --force-with-lease 2>/dev/null; then fail "lease must protect bob's commit"; fi
# (a bare --force would have silently deleted Bob's commit)
# Recover: fetch what they pushed, replay your work on top of it, push again.
git fetch -q
git rebase -q origin/feature 2>/dev/null
[[ "$(cat feature.txt)" == $'wip\nfix' ]] || fail "Bob's fix is kept"
git push -q --force-with-lease
# endregion force-with-lease

echo "remotes: ok"
