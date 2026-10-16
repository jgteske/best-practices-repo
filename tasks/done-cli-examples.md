# DONE - CLI examples: the same `logq` tool in Python and TypeScript

Plan: ~/.claude/plans/graceful-beaming-graham.md. Branch `docs/cli-examples`.

- [x] Python `examples/python/cli/logq/` (core, config, output, cli, __main__) + `test_logq.py` (25 tests) + `sample.log`
- [x] check-python.sh runs pytest in cli/; ruff known-first-party + mypy path
- [x] TS `examples/javascript/cli/` (core, config, output, cli, bin) + `cli.test.ts` (26 tests) + `sample.log`
- [x] tsconfig `allowImportingTsExtensions`, `@types/node@^22`, check-js.sh runs `*.test.ts`
- [x] pages: `docs/python/cli-patterns.md`, `docs/javascript/building-clis.md`; cross-links, sidebars, index tables
- [x] verify: `npm run check` green (with mypy/ruff/pytest from a scratch venv), manual runs, deliberate breaks

## Review

- Deliberate breaks, each caught by exactly its test: dropping Node's stdout `error` listener, swapping
  env/flag precedence in both languages, dropping Python's `BrokenPipeError` handler, dropping `os.dup2`.
- Found while writing the docs: Python's `| true` case (small output still buffered at exit) bypassed
  `entry()` and exited 120 with "Exception ignored on flushing sys.stdout". Fixed with an explicit
  `sys.stdout.flush()` inside the `try`, and covered by a new test.
- Corrected an assumption: on `process.stdout` Node *swallows* EPIPE rather than crashing. Without the
  listener, `filter huge.log | head -1` ran for 54 s and exited 0 (vs. 0.09 s / 141). The docs quote these numbers.
- Open: the "closed pipe -> 141" TS test failed once (exit 1) in about 300 runs under load, and couldn't be
  reproduced after that (0 failures in 960 direct runs and 220+ suite runs). The assertion now includes
  the child's stderr, so a recurrence in CI will show the cause.
