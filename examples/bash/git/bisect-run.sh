#!/usr/bin/env bash
# check-bash: run
# git bisect run: let a test script binary-search history for the commit that broke it.
set -euo pipefail

sandbox="$(mktemp -d)"
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
# No background housekeeping: a detached `git gc --auto` / `git maintenance` can still be
# writing into .git while the EXIT trap deletes the sandbox ("Directory not empty").
export GIT_CONFIG_COUNT=3 GIT_CONFIG_KEY_0=gc.auto GIT_CONFIG_VALUE_0=0 \
  GIT_CONFIG_KEY_1=gc.autoDetach GIT_CONFIG_VALUE_1=false \
  GIT_CONFIG_KEY_2=maintenance.auto GIT_CONFIG_VALUE_2=false
export GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com"
export GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$sandbox"

git init -q -b main calc && cd calc

# region history
# 32 commits; one of them (number 21) quietly breaks add().
for i in $(seq 1 32); do
  if (( i < 21 )); then op='+'; else op='-'; fi
  # shellcheck disable=SC2016  # the $(( )) is meant for calc.sh, not for this script
  printf 'add() { echo $(( $1 %s $2 )); }\n# revision %d\n' "$op" "$i" > calc.sh
  git add calc.sh
  git commit -q -m "Change $i"
done
# endregion history

# region test-script
# The test: exit 0 = good, 1-127 = bad, 125 = "can't test this commit, skip it".
cat > ../test.sh <<'EOF'
#!/usr/bin/env bash
echo run >> ../runs.log   # count the runs (not needed for bisect itself)
source ./calc.sh || exit 125
[[ "$(add 2 3)" == 5 ]]
EOF
chmod +x ../test.sh
# Keep the script OUTSIDE the work tree: bisect checks out old commits, and a
# tracked test file would change under you.
# endregion test-script

# region bisect
git bisect start HEAD HEAD~31 >/dev/null   # bad, then good
git bisect run ../test.sh >/dev/null
culprit="$(git log -1 --format=%s refs/bisect/bad)"
git bisect reset >/dev/null 2>&1             # back to where you started
echo "  first bad commit: $culprit"
[[ "$culprit" == "Change 21" ]] || fail "bisect found the culprit"
# 31 candidates took about log2(31) = 5 test runs instead of up to 31.
runs="$(wc -l < ../runs.log)"
echo "  test runs: $runs"
(( runs <= 6 )) || fail "bisect is logarithmic"
# endregion bisect

echo "bisect-run: ok"
