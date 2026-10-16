# Building CLIs with Node & TypeScript

[Running Node](./running-node) covers `parseArgs`, `process.env` and exit codes
in one flat script. This page covers what a CLI needs once other people and
other programs depend on it:

- subcommands
- settings from flags, environment variables *and* a config file, in a predictable order
- a `--json` mode, and colour only when a human is watching
- `-v` and `-q`
- streamed input, and backpressure on output
- a clean exit on `| head`
- I/O passed in as arguments, so all of it can be tested
- shipping it as a `bin`

All without a single dependency.

The example is `logq`, a small tool that summarizes and filters log files,
written in TypeScript:
[`examples/javascript/cli`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript/cli).
The [Python guide](../python/cli-patterns) builds the **same tool, flag for
flag**, so you can compare the two languages decision by decision.

## TypeScript that Node runs directly

Since Node 22.18 (and 23.6), `node bin.ts` just works. Node **strips** the type
annotations and runs what's left, with no build step and no `tsx` or
`ts-node`. Three rules come with that:

- **Only erasable syntax.** Node removes types but doesn't transform code, so
  `enum`, `namespace` with values, and constructor parameter properties
  (`constructor(private x: T)`) are rejected. Use `as const` objects and
  ordinary fields. [Const Assertions & Enum Alternatives](../typescript/const-assertions-and-enums)
  shows the replacements. TypeScript 5.8's `erasableSyntaxOnly` flag makes `tsc`
  enforce this rule.
- **Write the real file extension**: `import { run } from "./cli.ts"`. Node
  doesn't guess extensions. In `tsconfig.json`, `allowImportingTsExtensions`
  (which requires `noEmit`) lets `tsc` accept it.
- **Mark type-only imports**: `import type { Writable } from "node:stream"`.
  Node can't know a name is only a type, and a plain import of it fails at
  runtime.

Node **doesn't type-check**. Run `tsc --noEmit` in CI, as this repo's
`npm run typecheck` does.

## What it does

```
$ node bin.ts stats sample.log
logq: warning: sample.log:5: skipping malformed line
DEBUG  1
INFO   3
WARN   1
ERROR  1
total  6
(1 malformed line skipped)

$ node bin.ts filter -q --json -l error sample.log | jq -r .message
upload failed: connection reset

$ LOGQ_MIN_LEVEL=warn node bin.ts filter -v sample.log > /dev/null
logq: min_level=WARN (from LOGQ_MIN_LEVEL)
logq: color=auto (from default)
logq: warning: sample.log:5: skipping malformed line

$ node bin.ts stats --colour never
logq: error: stats: Unknown option '--colour'. ...
$ echo $?
2
```

## The layout

```
examples/javascript/cli/
├── core.ts       # parsing and counting - pure, knows nothing about the CLI
├── config.ts     # which value wins: defaults < file < env < flags
├── output.ts     # colour rules, rendering, stdout with backpressure, diagnostics
├── cli.ts        # run(io): argv -> settings -> command -> exit code
├── bin.ts        # the only file that touches `process`
├── sample.log
└── cli.test.ts
```

`bin.ts` is a few lines that connect `run()` to `process`. Everything worth
testing lives in `cli.ts` and below:

<<< ../../examples/javascript/cli/bin.ts

## Subcommands on `parseArgs`

`parseArgs` has no concept of subcommands, but it doesn't need one. Take the
first argument as the command, look it up in a table, and parse the rest with
the common options plus that command's own:

<<< ../../examples/javascript/cli/cli.ts#parser

<<< ../../examples/javascript/cli/cli.ts#commands

- **`strict: true`** turns a misspelled flag into a usage error (exit 2)
  instead of silently ignoring it.
- **`as const satisfies ParseArgsConfig["options"]`** checks the option table
  *and* keeps its literal types, so `values.json` is typed as `boolean`, not
  `string | boolean | undefined`.
- **`parseArgs` has no `choices`**, so `--color` and `--min-level` are
  validated by hand and turned into `UsageError`s.

Once you need nested command groups, generated help for each command, or shell
completion, [`commander`](https://github.com/tj/commander.js) earns its
place. Everything else on this page stays the same.

## Settings: one precedence order

From lowest to highest priority: **defaults < config file < environment
variables < flags**. The more specific and short-lived the source, the higher
it ranks. `resolveSettings` is a pure function: it takes everything as
arguments and never reads `process.env` or the filesystem itself:

<<< ../../examples/javascript/cli/config.ts#settings

Each value keeps track of its **source**. `-v` uses it to explain a setting,
and errors use it to say where a bad value came from:

```
$ LOGQ_COLOR=loud node bin.ts stats sample.log
logq: error: unknown color mode 'loud' (expected one of auto, always, never) (from LOGQ_COLOR)
```

<<< ../../examples/javascript/cli/config.ts#config-file

An explicit `--config` must exist, but the XDG default
(`~/.config/logq/config.json`) is optional. The file uses JSON because Node can
parse it with no dependency. It uses the same `min_level` keys as the Python
version's TOML, and unknown keys are rejected.

## Output

<<< ../../examples/javascript/cli/output.ts#diagnostics

Data is the only thing written to **stdout**. Warnings and details go to
**stderr** through one object, which applies `-q` and `-v` in a single place.
`--json` writes one compact document per line, and that is the stable
interface for scripts.

<<< ../../examples/javascript/cli/output.ts#color

An explicit `--color` always wins. After that come
[`NO_COLOR`](https://no-color.org), then `FORCE_COLOR`, then the rule that
matters most: no escape codes unless **stdout is a TTY**. In Node,
`process.stdout.isTTY` is `true` on a terminal and `undefined` (not `false`)
everywhere else.

### Backpressure and the closed pipe

This is where Node differs most from Python. `stream.write()` never blocks.
It buffers the chunk and returns `false` once the buffer is over its high-water
mark. A loop that ignores that return value, fed by a fast producer and read
by a slow consumer, buffers the whole output in memory. And when the reader
goes away (`| head -1`), the failure arrives later, as an `error` *event*:

<<< ../../examples/javascript/cli/output.ts#output

Awaiting `"drain"` gives the loop backpressure. The `error` listener is what
makes `| head` work, and the reason is surprising: on `process.stdout`, Node
**swallows** `EPIPE`. Without the listener nothing crashes, and that is the
problem. Writes are silently dropped while the program keeps going:

| `logq filter huge.log \| head -1` (45 MB) | Exit code | Time |
| --- | --- | --- |
| no `error` listener | `0` | 54 s, reading and filtering every line for nobody |
| listener + `BrokenPipe` | `141` | 0.09 s |

## Streaming input

<<< ../../examples/javascript/cli/cli.ts#io

An async generator yields one line at a time, so memory use doesn't depend on
the size of the file. Opening the file with `fs/promises.open()` *before*
reading turns a missing file into a clean `CliError` before any output is
written. `filehandle.readLines()` (Node 18.11+) then streams it. When `filter`
throws `BrokenPipe` in the middle of the loop, `for await` closes the
generators, and their `finally` blocks close the file.

## `run`: argv in, exit code out

<<< ../../examples/javascript/cli/cli.ts#run

`run` receives argv, the three streams and the environment as one `Io`
object, and returns the exit code. It never calls `process.exit()`. A
`CliError` becomes a one-line message and its `exitCode`. Anything else is a
bug and is rethrown so it crashes with a stack trace.

| Exit code | Meaning | logq example |
| --- | --- | --- |
| `0` | success | |
| `1` | it ran and failed | missing file, `--strict` and a malformed line, a bad config value |
| `2` | wrong usage | unknown flag or command, `--min-level loud` |
| `130` | interrupted by Ctrl-C | Node's default: the process dies by SIGINT |
| `141` | the reader closed the pipe | `BrokenPipe`'s `exitCode` (128 + SIGPIPE) |

**Ctrl-C needs no code.** Unlike Python, Node's default reaction to SIGINT is
already right for a CLI: no stack trace, and the process dies *by the signal*,
which the shell reports as 130. Install a `process.on("SIGINT")` handler only
when there is something to clean up, such as a temp file or half-written
output, and then set exit code 130 yourself. A handler that does nothing else
stops Ctrl-C from working at all.

## Testing

Most tests call `run()` in the same process with `PassThrough` streams and an
**empty environment**, so a developer's own `LOGQ_*` variables or
`~/.config/logq` can never change a test's result:

<<< ../../examples/javascript/cli/cli.test.ts#test-precedence

<<< ../../examples/javascript/cli/cli.test.ts#test-output

The fake stdout gets `isTTY: true` through `Object.assign`. That's all it takes
to test colours without a real terminal.

<<< ../../examples/javascript/cli/cli.test.ts#test-errors

Pipes and signals happen at the process level, so those tests spawn the real
`bin.ts`:

<<< ../../examples/javascript/cli/cli.test.ts#test-process

`node --test` runs `.test.ts` files directly too, with the same type
stripping. See [Testing with node:test](./testing-with-node-test).

## Shipping it as a command

```json
{
  "name": "logq",
  "type": "module",
  "bin": { "logq": "./dist/bin.js" },
  "files": ["dist"],
  "engines": { "node": ">=22.18" },
  "scripts": { "build": "tsc -p tsconfig.build.json", "prepack": "npm run build" }
}
```

- **`bin`** maps a command name to a file. On install, npm links it into
  `node_modules/.bin` (or onto `PATH` for `npm i -g`) and makes it executable.
  The file needs the `#!/usr/bin/env node` shebang on its first line, as in
  `bin.ts`.
- **Compile before publishing.** Node refuses to strip types under
  `node_modules`
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so a published package must
  ship JavaScript. Running `.ts` directly is for your own repo and scripts.
  `tsc` with `rewriteRelativeImportExtensions` (TS 5.7+) rewrites the `./cli.ts`
  imports to `./cli.js` in the output.
- **`npm link`** in the project puts a development copy on your `PATH`, so you
  can try the real command before publishing.

[Creating & Publishing a Package](./creating-packages) covers `files`,
`prepack` and the rest of publishing.

## Python and Node, side by side

| Concern | Python (`logq/cli.py`) | Node (`cli.ts`) |
| --- | --- | --- |
| Parse argv | `argparse`, with subparsers and `choices` | `parseArgs` + a command table, with choices checked by hand |
| Testable entry | `main(argv, stdin=, stdout=, stderr=, env=)` | `run({ argv, stdin, stdout, stderr, env })` |
| Config file | TOML via `tomllib` | JSON via `JSON.parse` |
| Stream input | generators over file objects | async generators over `readLines()` |
| Output backpressure | `write()` blocks | await `"drain"` when `write()` returns `false` |
| `\| head` | catch `BrokenPipeError`, flush, `dup2` to `/dev/null` | listen for `error`, throw on `EPIPE` |
| Ctrl-C | catch `KeyboardInterrupt`, return 130 | nothing: the default already gives 130 |
| Install as a command | `[project.scripts]` | `"bin"` + shebang |

## Checklist

- Precedence: **defaults < config file < env < flags**. Keep track of each
  value's source and report it.
- Data on **stdout**, everything else on **stderr**. `--json` is the machine
  interface, and colour depends on `isTTY`.
- `parseArgs` with `strict: true`. Treat the first argument as the command and
  validate choices yourself.
- `run(io)` takes every outside dependency and returns the exit code. `bin.ts`
  is the only file that touches `process`.
- Stream input, respect `write()`'s return value, and handle `EPIPE` on stdout,
  or `| head` will run to the end of the input.
- Run `.ts` directly while developing, and compile with `tsc` before
  publishing a `bin`.
