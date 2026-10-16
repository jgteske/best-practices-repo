#!/usr/bin/env bash
# check-bash: run
# Fixup commits + rebase --autosquash, --update-refs for stacked branches, and rerere.
set -euo pipefail

sandbox="$(mktemp -d)"
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com"
export GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"
# Accept the generated rebase todo list as-is - what you'd do by saving the editor unchanged.
export GIT_SEQUENCE_EDITOR=:
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$sandbox"

commit_file() { # commit_file <file> <content> <message>
  printf '%s\n' "$2" > "$1"
  git add "$1"
  git commit -q -m "$3"
}

git init -q -b main shop && cd shop
commit_file README.md "# Shop" "Initial commit"

# region fixup
git switch -q -c feature/cart
commit_file cart.py "def total(items): return sum(items)" "Add cart total"
commit_file api.py "GET /cart" "Expose the cart over HTTP"

# Review feedback on the FIRST commit. Don't add "fix typo" on top - make a fixup for it:
commit_file cart.py "def total(items: list[int]) -> int: return sum(items)" "tmp"
git reset -q --soft HEAD~1
git commit -q --fixup=":/Add cart total"   # :/text = the newest commit whose message matches
git log --format='  %s' main..
# endregion fixup

# region autosquash
# --autosquash moves each "fixup! X" right after X and melds it in.
git rebase -q -i --autosquash main
git log --format='  %s' main..
[[ "$(git log --format=%s main..)" == $'Expose the cart over HTTP\nAdd cart total' ]] || fail "fixup squashed"
[[ "$(git show HEAD~1:cart.py)" == *"list[int]"* ]] || fail "fix is inside the original commit"
# Set rebase.autoSquash=true to make it the default for every `rebase -i`.
# endregion autosquash

# region update-refs
# Stacked branches: feature/api builds on feature/cart. Fixing the bottom one would
# normally leave the top one pointing at the old commits; --update-refs moves both.
git switch -q -c feature/api
commit_file api.py "GET /cart and POST /cart" "Add POST /cart"
old_cart="$(git rev-parse feature/cart)"
printf '%s\n' "def total(items: list[int]) -> int: return sum(items, 0)" > cart.py
git commit -q -a --fixup=":/Add cart total"   # another fix for the bottom commit
git rebase -q -i --autosquash --update-refs main
[[ "$(git rev-parse feature/cart)" != "$old_cart" ]] || fail "lower branch was rewritten"
[[ "$(git rev-parse feature/cart)" == "$(git rev-parse HEAD~1)" ]] || fail "lower branch moved with the rebase"
git log --format='  %s%d' --decorate-refs=refs/heads main..
# endregion update-refs

# region rerere
# rerere = "reuse recorded resolution": resolve a conflict once, and git replays your
# resolution when the same conflict comes back (repeated rebases, re-merges, test merges).
git config rerere.enabled true
git switch -q -c topic main
commit_file README.md "# Shop - fast checkout" "Pitch fast checkout"
git switch -q main
commit_file README.md "# Shop - fair prices" "Pitch fair prices"

git merge -q topic >/dev/null 2>&1 && fail "expected a conflict"
printf '%s\n' "# Shop - fair prices, fast checkout" > README.md   # resolve by hand, once
git add README.md
git commit -q --no-edit >/dev/null 2>&1   # rerere records the conflict -> resolution pair here

# Later the same merge happens again (here: undo it and redo it).
git reset -q --hard HEAD~1
git merge -q topic >/dev/null 2>&1 && fail "still a conflict for git"
# ...but rerere has already written the recorded resolution into the file:
[[ "$(cat README.md)" == "# Shop - fair prices, fast checkout" ]] || fail "resolution replayed"
git add README.md && git commit -q --no-edit >/dev/null   # review it, then stage (or set rerere.autoUpdate)
# endregion rerere

echo "autosquash-and-rerere: ok"
