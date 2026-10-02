#!/usr/bin/env bash
# check-bash: run
# Repository configuration: .gitignore, .gitattributes, aliases and hooks.
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

git init -q -b main service && cd service

# region gitignore
cat > .gitignore <<'IGNORE'
# dependencies and build output
node_modules/
dist/
# secrets - but keep the template
.env
.env.*
!.env.example
# editor and OS noise belongs in your *global* ignore file, not here
IGNORE
mkdir -p node_modules/x dist src
touch node_modules/x/index.js dist/app.js .env .env.local .env.example src/app.ts

git add .
git status --short | sed 's/^/  /'
[[ "$(git diff --staged --name-only | tr '\n' ' ')" == ".env.example .gitignore src/app.ts " ]] || fail "ignored files stayed out"
# Why is a file ignored? check-ignore -v names the rule and its line.
git check-ignore -v .env.local | sed 's/^/  /'
git commit -q -m "Initial commit"
# endregion gitignore

# region untrack
# .gitignore only affects UNtracked files. A file committed by mistake must be removed from the index.
echo "SECRET=1" > config.local && git add config.local && git commit -q -m "Oops"
echo "config.local" >> .gitignore
git rm -q --cached config.local      # untrack, keep the file on disk
git commit -q -am "Stop tracking config.local"
[[ -f config.local ]] || fail "still on disk"
[[ -z "$(git ls-files config.local)" ]] || fail "no longer tracked"
# It is still in history: a leaked secret must be ROTATED, not just deleted.
# endregion untrack

# region gitattributes
cat > .gitattributes <<'ATTR'
# Normalise line endings in the repo; check out LF everywhere except where noted.
* text=auto eol=lf
*.bat text eol=crlf
# Never try to diff or merge these as text.
*.png binary
# Generated files: collapse them in diffs on GitHub.
package-lock.json linguist-generated
ATTR
[[ "$(git check-attr eol -- script.bat)" == "script.bat: eol: crlf" ]] || fail "bat files get crlf"
git add .gitattributes && git commit -q -m "Add .gitattributes"
# endregion gitattributes

# region aliases
git config alias.lg "log --oneline --graph --decorate -10"
git config alias.unstage "restore --staged"
git lg | sed 's/^/  /'
# endregion aliases

# region hooks
# A pre-commit hook runs before every commit; a non-zero exit aborts the commit.
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
if git diff --cached -U0 | grep -q '^+.*console\.log'; then
  echo "pre-commit: remove console.log before committing" >&2
  exit 1
fi
HOOK
chmod +x .git/hooks/pre-commit

echo 'console.log("debug")' > src/app.ts && git add src/app.ts
if git commit -q -m "Debugging" 2>/dev/null; then fail "hook should block"; fi
echo 'export const app = 1;' > src/app.ts && git add src/app.ts
git commit -q -m "Export app"
# .git/hooks is not versioned: share hooks via core.hooksPath or a tool (husky, lefthook, pre-commit).
# endregion hooks

echo "config-ignore-hooks: ok"
