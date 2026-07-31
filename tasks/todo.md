# Task: Linux / Bash / terminal documentation section

## Plan

- [x] New top-level section `docs/linux/` with its own `index.md`, plus nav and
      sidebar entries in `docs/.vitepress/config.ts` (per `docs/guide/writing-docs.md`).
- [x] Using-the-shell pages: shell basics, files & directories, pipes &
      redirection, text processing.
- [x] System pages: permissions & ownership, processes/jobs/signals, system &
      packages & services, networking & remote work.
- [x] Scripting pages: bash scripting basics, writing robust scripts.
- [x] Reference: command cheat sheet + emergency handbook.
- [x] Runnable examples under `examples/bash/`, imported with `<<<` snippets.
- [x] A checker for the new language: `scripts/check-bash.sh` (`bash -n` always,
      `shellcheck` when installed), wired into `npm run check:bash` / `check`
      and the GitHub Actions workflow.
- [x] Update README, home page, guide index, and writing-docs for the new
      section and the one-checker-per-language convention.

## Review

12 new pages under `docs/linux/`; 8 new shell examples under `examples/bash/`
(`basics/`, `robust/`, `pipelines/`, `real-world/`).

Verification performed:

| Check | Result |
| --- | --- |
| `npm run check` (typecheck + `check:bash` + site build) | passes |
| `bash -n` on all 8 examples | passes |
| `shellcheck` 0.11.0 at default severity (fetched via the npm `shellcheck` package) | 0 findings across all examples and `scripts/check-bash.sh` |
| Actually running the examples | `backup.sh` end-to-end (create → verify → atomic `mv` → prune to `-k`, usage exit 64, validation error), plus `variables-and-quoting.sh`, `conditionals-and-loops.sh`, `functions-and-arguments.sh`, `arrays-and-getopts.sh`, `strict-mode.sh`, `trap-cleanup.sh` |
| Mermaid diagrams | all 15 blocks in `docs/` parsed with the real `mermaid` package under jsdom - 0 failures (this also clears the earlier "could not verify the flowchart" caveat from the hook-chaining task) |
| Built output | all 12 `docs/.vitepress/dist/linux/*.html` present, snippets inlined; VitePress dead-link check passes |

Two fixes came out of actually running things: `comm -13` had its operands
backwards in `log-report.sh`, and `backup.sh` returned exit 1 for a bad `-k`
value while its own `--help` documented 64 for usage errors (now `die_usage`).

Not done: `browser` rendering of the mermaid diagrams (no Chrome executable in
this environment) - the parse check above is the substitute. Pages are prose +
command reference; only the `.sh` examples are machine-verified, so command
flags in tables are reviewed by hand, not executed.
