#!/usr/bin/env bash
# check-bash: run
# The everyday loop: inspect, stage precisely, commit with a good message.
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

git init -q -b main blog && cd blog
printf 'title: Hello\n' > post.md && printf 'body { color: black; }\n' > style.css
git add . && git commit -q -m "Add first post"

# region inspect
# Two unrelated changes in the working tree...
printf 'title: Hello, world\n' > post.md
printf 'body { color: navy; }\n' > style.css
git status --short | sed 's/^/  /'
# `git diff` shows unstaged changes; `git diff --staged` shows what will be committed.
git diff --stat | sed 's/^/  /'
# endregion inspect

# region stage-precisely
# ...become two focused commits. Stage by path (or by hunk with `git add -p`).
git add post.md
[[ "$(git diff --staged --name-only)" == post.md ]] || fail "only post.md staged"
[[ "$(git diff --name-only)" == style.css ]] || fail "style.css still unstaged"
git commit -q -m "Polish the first post's title"
git commit -q -am "Switch text colour to navy"
[[ -z "$(git status --porcelain)" ]] || fail "clean after two commits"
# endregion stage-precisely

# region commit-message
# Subject: imperative, <= 50 chars, no trailing period. Blank line. Body: WHY.
git commit -q --allow-empty -F - <<'MSG'
Cache rendered posts for five minutes

Rendering markdown dominated response time on the front page (p95 of
420 ms). Posts change rarely, so a short cache is safe; editors can
bust it with ?fresh=1.
MSG
subject="$(git log -1 --format=%s)"
(( ${#subject} <= 50 )) || fail "subject too long"
git log --oneline | sed 's/^/  /'
# endregion commit-message

# region stash
# Park unfinished work to switch tasks, then bring it back.
printf 'draft\n' > draft.md
git add draft.md
git stash push -q -m "half-written post"
[[ -z "$(git status --porcelain)" ]] || fail "stash cleaned the tree"
git stash pop -q
[[ -f draft.md ]] || fail "stash pop restored the draft"
# endregion stash

echo "everyday-workflow: ok"
