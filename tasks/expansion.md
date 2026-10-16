# Expansion: dates, SQLite, Python depth, React performance, Git power tools, GitHub Actions

Plan: ~/.claude/plans/think-about-what-other-immutable-clarke.md. Branch `docs/expansion`, one commit per topic.

- [x] 1. Dates & times: `docs/python/dates-and-times.md` + `examples/python/dates/`, `docs/javascript/dates-and-times.md` + `examples/javascript/datetime/`
- [ ] 2. SQLite: Python `sqlite3` + `node:sqlite` pages
- [ ] 3. Python depth: threads & processes, performance & caching, pydantic validation (+ `requires` marker in check-python.sh)
- [ ] 4a. React performance (Profiler-counted renders)
- [ ] 4b. Git power tools (worktrees, cherry-pick, bisect run, autosquash, rerere)
- [ ] 5. CI/CD & GitHub Actions section, actionlint check, split repo CI into check + deploy
- [ ] verify: `npm run check` green on the full branch; deliberate breaks caught

## Notes

- 1: Python example dir is `dates/`, not `datetime/`: a directory named like a stdlib module is a shadowing trap the
  modules page warns about. Temporal branch verified with `node --harmony-temporal` (Node 24 has it flagged only).
