# Expansion: dates, SQLite, Python depth, React performance, Git power tools, GitHub Actions

Plan: ~/.claude/plans/think-about-what-other-immutable-clarke.md. Branch `docs/expansion`, one commit per topic.

- [x] 1. Dates & times: `docs/python/dates-and-times.md` + `examples/python/dates/`, `docs/javascript/dates-and-times.md` + `examples/javascript/datetime/`
- [x] 2. SQLite: Python `sqlite3` + `node:sqlite` pages
- [x] 3. Python depth: threads & processes, performance & caching, pydantic validation (+ `requires` marker in check-python.sh)
- [ ] 4a. React performance (Profiler-counted renders)
- [ ] 4b. Git power tools (worktrees, cherry-pick, bisect run, autosquash, rerere)
- [ ] 5. CI/CD & GitHub Actions section, actionlint check, split repo CI into check + deploy
- [ ] verify: `npm run check` green on the full branch; deliberate breaks caught

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
