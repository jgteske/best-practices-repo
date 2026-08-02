# Running Node

Everything between "I have a `.mjs` file" and "it runs the same on my machine, my
colleague's, and CI": pinning a version, the CLI flags that replace tooling you
might otherwise install, and how a program reads its arguments and reports its
result.

## Pinning a version

Node's release line matters more than most runtimes': even-numbered majors become
LTS, odd ones never do. Run an **active LTS** in production unless you have a
specific reason not to.

State the version in three places, because each one is read by a different
audience:

| Where | What it does | Who reads it |
| --- | --- | --- |
| `.nvmrc` (just `22`) | `nvm use` picks it up with no argument | your shell |
| `"engines": { "node": ">=22" }` in `package.json` | npm warns - or errors, with `engine-strict=true` | installers, and anyone reading the repo |
| `actions/setup-node` `node-version` | the version CI actually runs | your pipeline |

They can drift. Keeping them in sync is a five-second job that prevents the
"works locally, fails in CI" class of bug entirely - this repo's CI pins 22 and
`package.json` declares `>=22` for exactly that reason.

`nvm` (or `fnm`, or `mise`) is the usual manager; the important part is that a
version manager exists at all, rather than which one. Avoid installing Node from
a distro package manager for development work - the versions lag badly and
`sudo npm -g` follows.

## The CLI flags worth knowing

```bash
node app.mjs                     # run a file
node --watch app.mjs             # re-run on change - no nodemon needed
node --watch-path=src app.mjs    # watch a directory rather than the import graph
node --env-file=.env app.mjs     # load a .env file - no dotenv needed
node --check app.mjs             # parse only; the syntax check this repo's CI runs
node --test                      # run the built-in test runner
node --run build                 # run a package.json script, without npm's overhead
node -e 'console.log(1+1)'       # evaluate an expression
node --experimental-strip-types app.ts  # run TypeScript by discarding the types
```

Three of those replace a dependency people still reach for out of habit:
`--watch` instead of `nodemon`, `--env-file` instead of `dotenv`, and `--test`
instead of a test framework. All three are stable on Node 22.

::: tip `node --run` vs `npm run`
`node --run build` executes the `scripts.build` entry directly, skipping npm's
own startup. It is noticeably faster, and deliberately *simpler*: no `pre`/`post`
hooks, no extra `PATH` munging beyond `node_modules/.bin`. Use it where the
script is straightforward; keep `npm run` where you depend on lifecycle hooks.
:::

Two more that are worth knowing exist, for the day you need them:

- **`node --inspect app.mjs`** opens the debugger port; `--inspect-brk` pauses on
  the first line. Chrome DevTools and VS Code both attach to it.
- **`node --permission --allow-fs-read=./data app.mjs`** runs with an explicit
  allow-list for filesystem, child processes, and worker threads. Still marked
  experimental, but it is the right primitive for running untrusted code.

## Arguments, environment, output

<<< ../../examples/javascript/node/cli-args.mjs{js}

```
parsed arguments:
  name ......... world
  verbose ...... false
  retries ...... 3
  positionals .. (none)

environment:
  LOG_LEVEL .... info (defaulted)
  colour ....... true
  PORT ......... 3000
{"name":"world","retries":3}
[diagnostic] this line is stderr, so it stays out of the pipe
```

**`process.argv` is always `[execPath, scriptPath, ...rest]`.** Forgetting to
slice off the first two is the most common Node CLI bug. `parseArgs` from
`node:util` handles that, plus short flags, defaults, and validation - with no
dependency:

- **`strict: true`** (the default) makes an unknown flag throw. A typo'd flag
  silently ignored is far worse than a crash.
- **There is no number type.** Everything is a string or a boolean; convert and
  validate yourself, as the example does for `--retries`.
- **`allowPositionals: true`** is opt-in, so a command that takes no file
  arguments rejects them automatically.

For anything with subcommands, nested help, or shell completion, a library
(`commander`, `yargs`) earns its place. For a single script, `parseArgs` is
enough.

**Every value in `process.env` is a string or `undefined`.** There are no
booleans: `"false"`, `"0"`, and `""` are all truthy as strings, so compare
explicitly. Read and validate config once at startup rather than reaching into
`process.env` from deep inside the code - the same argument as
[Type-Safe Validation](/typescript/type-safe-validation), one layer down.

**Results go to stdout, diagnostics go to stderr.** That is what makes
`node script.mjs > out.json` produce a clean file while progress logs still reach
your terminal. See [Pipes & Redirection](/linux/pipes-and-redirection) for the
shell side of the same contract.

## Exit codes

A process's exit code is its only machine-readable result, and CI reads nothing
else.

| Code | Meaning |
| --- | --- |
| `0` | success |
| `1` | generic failure (an uncaught exception exits with this) |
| `2` | conventionally, a usage error |
| `64` | `EX_USAGE` from `sysexits.h` - bad arguments, as used in the example |
| `130` / `143` | killed by SIGINT (128+2) / SIGTERM (128+15) |

::: warning Prefer `process.exitCode` to `process.exit()`
`process.exit(1)` terminates **immediately**, which can truncate a pending
`stdout` write and skip pending cleanup. Setting `process.exitCode = 1` and
letting the event loop drain gives you the same exit status with none of the
data loss. Reserve `process.exit()` for a shutdown path that has already
finished flushing - see [Errors & Graceful Shutdown](./errors-and-shutdown).
:::

## The REPL

`node` with no arguments opens a REPL. It is genuinely useful for checking a
coercion rule or an API shape, with a few conveniences worth knowing: `_` holds
the last result, `.editor` opens a multi-line buffer (`Ctrl-D` to run), `.load
file.mjs` pulls a file in, and `.save` writes the session out. Core modules are
pre-loaded, so `path.join("a", "b")` works with no `import`.

The REPL runs in CommonJS mode, so top-level `await` behaves differently and
`import` statements are not available - use `await import("node:fs/promises")`.

## Summary

- Run an active LTS, and pin it in `.nvmrc`, `engines`, and CI together.
- `--watch`, `--env-file`, and `--test` replace `nodemon`, `dotenv`, and a test
  framework respectively.
- `parseArgs` gives you argument parsing, defaults, and unknown-flag rejection
  with no dependency.
- `process.env` values are strings; validate config once, at startup.
- stdout for results, stderr for diagnostics.
- Set `process.exitCode`; call `process.exit()` only after everything is flushed.
