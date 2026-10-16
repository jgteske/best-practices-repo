# DONE - Git & Collaboration section

Workstream 4 of 4 (see ~/.claude/plans/look-at-the-repo-partitioned-lake.md). Branch `docs/git-section`, from main.

- [x] `examples/bash/git/*.sh` (6 scripts): mental-model, everyday-workflow, branching-merge-rebase,
      undoing-things, remotes (bare repo as origin + two clones), config-ignore-hooks
- [x] each script: own `mktemp -d` sandbox, `GIT_CONFIG_GLOBAL=/dev/null`, fixed identity and dates
      (deterministic hashes), `[[ ]] || fail` assertions, `# region` markers
- [x] `scripts/check-bash.sh`: runs scripts marked `# check-bash: run` (opt-in), with a timeout and
      output on failure, like check-js.sh
- [x] `docs/git/`: index + 6 pages + cheatsheet. Also nav, sidebar, home hero, README, guide (marker documented).

## Review

- `npm run check:bash`: 14 scripts parse, shellcheck is clean (0.11 via a scratch venv), and 6 run ok.
  Two runs produce byte-identical output, so the quoted hashes are exact.
- Deliberate break (`false` after an assertion) fails the check and shows the output. Reverted.
- Lesson: `git log | head -3` under `set -o pipefail` dies with SIGPIPE. Use `git log -3` (it's now a comment in the example).
- Local git is 2.43, CI's is newer. The scripts use only `switch`/`restore`/`init -b` (2.28+).
- `npm run docs:build` passes, with no leaked region markers.
