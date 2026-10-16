# DONE - Expansion: dates, SQLite, Python depth, React performance, Git power tools, GitHub Actions

Plan: ~/.claude/plans/think-about-what-other-immutable-clarke.md. Branch `docs/expansion`, one commit per topic.

- [x] 1. Dates & times: `docs/python/dates-and-times.md` + `examples/python/dates/`, `docs/javascript/dates-and-times.md` + `examples/javascript/datetime/`
- [x] 2. SQLite: Python `sqlite3` + `node:sqlite` pages
- [x] 3. Python depth: threads & processes, performance & caching, pydantic validation (+ `requires` marker in check-python.sh)
- [x] 4a. React performance (render counts asserted in tests)
- [x] 4b. Git power tools (worktrees, cherry-pick, bisect run, autosquash, rerere)
- [x] 5. CI/CD & GitHub Actions section, actionlint check, repo CI checks PRs; deploy is its own least-privilege job
- [x] verify: `npm run check` green on the full branch (all optional tools but jupyter installed); deliberate breaks caught

## Notes

- 1: Python example dir is `dates/`, not `datetime/`: a directory named like a stdlib module is a shadowing trap the
  modules page warns about. Temporal branch verified with `node --harmony-temporal` (Node 24 has it flagged only).
- 2: Found while writing: `PRAGMA foreign_keys = ON` after `connect(autocommit=False)` is a silent no-op (a
  transaction is always open), so orphan rows were accepted. The example now connects with autocommit=True, sets
  the PRAGMA, then flips `conn.autocommit = False`, and asserts the FK violation; the page tells the story.
  node:sqlite examples also verified under Node 22.14 (CI uses 22.x).
- 3: `# check-python: requires <pkg>` skips running AND type-checking (mypy `--exclude`, which merges with the
  config's `exclude`) when the package is missing; verified in a pydantic-free venv. CI installs pydantic.
  Timing claims: only the robust ones are asserted (8 waits on threads < 1.0 s; executor finish order with
  ≥ 100 ms gaps). The lost-update race is forced with `time.sleep(0)`, consistently ~200/1600.
- 4a: Plan said "count renders with `<Profiler onRender>`" - wrong: a probe showed Profiler fires on every parent
  render even when the memo child bails out (3 calls either way). Switched to a no-deps `useEffect` counter behind
  a context (`render-counter.tsx`); the page explains why. Deliberate break (inline style object) -> 4 != 1.
  Inline `{{ }}` in a markdown table is parsed by Vue: wrapped in `::: v-pre`.
- 4b: `git bisect start -q` / `reset -q` are not valid (`-q` parsed as a commit). Deliberate break of
  `--update-refs` first PASSED: an empty fixup + fixed timestamps rewrote commits byte-identically, so the hashes
  (and the lower branch) never changed. The fixup now changes content, and the script also asserts the lower
  branch was rewritten. Disabling rerere fails the script, as it should.
- 5: actionlint resolves local `uses: ./.github/workflows/x.yml` against the GIT ROOT, so the examples live in
  `examples/github-actions/.github/workflows/` and check-actions.sh lints a copy inside a throwaway `git init`.
  `must-fail/` fixtures name their expected errors (`# expect-error:`); the first draft of injection.yml "failed"
  only because of a YAML syntax error, which is exactly what that marker now prevents.
  Inline `${{ }}` in prose is parsed by Vue -> those CI pages are wrapped in `::: v-pre` (anchors still render).
  Corrected while writing: without `shell:`, Linux steps run `bash -e {0}` (no pipefail).

## Review

- 5 commits on `docs/expansion`, one per topic; 12 new pages + a new CI/CD section (6 pages), 30-odd example files.
- Every new claim with a number is either asserted by the example (render counts, bisect runs, FK rejection,
  rerere replay, actionlint rejections) or quoted from a real run with variance noted (timings).
- Repo CI (`ci.yml`, renamed from deploy-docs.yml): runs on `pull_request` (previously only on push to main),
  top-level `contents: read`, Pages permissions only on the deploy job, actions pinned by SHA to the newest
  release WITHIN the major already used (newer majors exist: checkout v7, setup-node v7, setup-python v7,
  configure-pages v6, upload-pages-artifact v5, deploy-pages v5 - upgrading majors is a separate change).
- Not verified locally: the workflow itself on GitHub (YAML anchors in `on.paths`, the deploy job gating), and
  notebook execution (jupyter not installed here). Both run in CI on the PR.
