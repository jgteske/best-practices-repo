# Node Core APIs

Node ships with enough built in that a surprising number of small programs need
zero dependencies. This page covers the modules you reach for daily - files,
paths, process, OS - and the two escape hatches for when one thread is not
enough.

Import them with the **`node:` prefix**: `import fs from "node:fs/promises"`. The
prefix cannot be shadowed by an npm package of the same name, and it makes
builtins obvious at a glance.

## Files and paths

<<< ../../examples/javascript/node/fs-and-path.mjs{js}

```
paths:
  join normalises ..... javascript/modules
  resolve is absolute . true
  parse ............... {"root":"/","dir":"/srv/app","base":"report.tar.gz","ext":".gz","name":"report.tar"}
  extname ............. .gz <- only the last one
  relative ............ ../logs/today.log
  traversal blocked ... true (/srv/etc/passwd)
```

### `node:path`

**Never build a path with string concatenation.** `dir + "/" + name` gives you
`dir//name` when `dir` already ends in a slash, the wrong separator on Windows,
and - the one that matters - no protection at all when `name` contains `../`.

| Function | Does |
| --- | --- |
| `path.join(a, b)` | joins and normalises, resolving `.` and `..` |
| `path.resolve(a, b)` | the same, but always returns an absolute path (relative to `cwd`) |
| `path.parse(p)` | `{ root, dir, base, name, ext }` |
| `path.extname(p)` | the **last** extension only - `.gz`, not `.tar.gz` |
| `path.relative(from, to)` | the path that gets you from one to the other |
| `path.sep` | `/` or `\` |

The containment check in the example is the pattern to memorise for any path
built from outside input:

```js
const full = path.resolve(baseDir, userSuppliedName);
if (full !== baseDir && !full.startsWith(baseDir + path.sep)) {
  throw new Error("path escapes the base directory");
}
```

`resolve` collapses the `..` segments *first*, so the comparison is against the
real destination rather than the string the caller sent.

### `node:fs/promises`

```
files:
  read back ........... "first line\nsecond line\n"
  as a Buffer ......... <Buffer 66 69 72 73 74>
  dir  nested
  file notes.txt
  size / mtime ........ 23 bytes, 2026-08-02
```

| API | When |
| --- | --- |
| `node:fs/promises` | the default - `await`, and errors arrive as rejections |
| `node:fs` sync | startup config only; it blocks the **entire** event loop |
| `node:fs` callback | older code; the promise API covers everything |
| streams | any file whose size you do not control - see [Streams & Buffers](./streams-and-buffers) |

Details that save a debugging session each:

- **`readFile(p)` without an encoding returns a `Buffer`**; with `"utf8"` it
  returns a string. Both pull the entire file into memory - fine for a 4KB
  config, an incident for a 4GB log.
- **`mkdir(p, { recursive: true })` is idempotent**, so there is no need to check
  whether the directory exists first.
- **`readdir(p, { withFileTypes: true })`** returns `Dirent` objects with
  `isDirectory()`/`isFile()`, avoiding a `stat` call per entry.
- **`rm(p, { recursive: true, force: true })`** is the modern recursive delete;
  `force` makes "already gone" a success.
- **`mkdtemp(path.join(tmpdir(), "prefix-"))`** creates a uniquely named temp
  directory - the safe way, with no name-collision race.

::: warning Don't check, then act
```js
if (existsSync(p)) await readFile(p);   // race condition
```
The answer can change between the two calls. Attempt the operation and handle the
error instead - and branch on **`error.code`** (`ENOENT`, `EACCES`, `EEXIST`),
never on the message string. The errno code is the API; the message is prose.
:::

```
error handling:
  existsSync says ..... false
  ENOENT handled ...... the errno code is the API, not the message
  temp dir cleaned up . true
```

Clean-up belongs in a `finally` block, as the example does, so a failure halfway
through does not leave a temp directory behind.

## `process`

| Property | Is |
| --- | --- |
| `process.argv` | `[execPath, scriptPath, ...rest]` - see [Running Node](./running-node) |
| `process.env` | environment variables, all strings or `undefined` |
| `process.cwd()` | the **caller's** working directory, not the script's - use `import.meta.dirname` for paths relative to the file |
| `process.exitCode` | set this rather than calling `process.exit()` |
| `process.platform` / `.arch` | `"linux"`/`"darwin"`/`"win32"`, `"x64"`/`"arm64"` |
| `process.version` | the Node version string |
| `process.memoryUsage()` | `{ rss, heapTotal, heapUsed, external }`, in bytes |
| `process.hrtime.bigint()` | monotonic nanoseconds - the right clock for measuring durations |

`process.on("SIGTERM", …)`, `uncaughtException`, and `unhandledRejection` are
covered in [Errors & Graceful Shutdown](./errors-and-shutdown).

::: tip `cwd` is not where your file lives
A script run as `node tools/build.mjs` from the repo root has a `cwd` of the repo
root, not `tools/`. Anything resolved relative to the script itself must go
through `import.meta.dirname`; anything the user names on the command line is
relative to `cwd`. Mixing them up produces bugs that only appear when someone
runs the script from a different directory.
:::

## `node:os` and `node:url`

`node:os` describes the machine: `os.tmpdir()`, `os.homedir()`,
`os.cpus().length` (the usual input to a worker-pool size), `os.totalmem()`,
`os.hostname()`, `os.EOL`.

`node:url` is mostly redundant now that `URL` is global - `new URL(href, base)`
parses and resolves, and `url.searchParams` handles query strings with correct
encoding. The two functions still worth importing are `fileURLToPath` and
`pathToFileURL`, which convert between the `file://` URLs that ESM speaks and the
plain paths that `node:fs` wants.

```js
const url = new URL("/v1/items?tag=a&tag=b", "https://api.example.com");
url.searchParams.getAll("tag");        // ["a", "b"]
url.searchParams.set("page", "2");
String(url);  // "https://api.example.com/v1/items?tag=a&tag=b&page=2"
```

Never assemble a query string by hand; `searchParams` escapes correctly and you
will not.

## Running other programs

`node:child_process` has four functions and one important split:

| Function | Returns | For |
| --- | --- | --- |
| `spawn` | a stream-based `ChildProcess` | long-running output, large output, streaming |
| `execFile` | buffered stdout/stderr | short commands with a known-small output |
| `exec` | the same, **via a shell** | when you genuinely need shell features |
| `fork` | a child Node process with an IPC channel | separate Node workers |

::: warning `exec` runs a shell
Interpolating outside input into an `exec` string is command injection:

```js
exec(`git log --author=${name}`);            // a shell parses this
execFile("git", ["log", `--author=${name}`]); // no shell involved
```

`execFile` passes arguments as an array, so quoting, `;`, and `$(…)` have no
special meaning. The same distinction as
[quoting in bash](/linux/shell-basics), enforced by choosing the right function.
:::

The promise-based versions come from `node:util`:

```js
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const { stdout } = await run("git", ["rev-parse", "HEAD"]);
```

`execFile` buffers output in memory and rejects when it exceeds `maxBuffer`
(1MB by default) - `spawn` is the answer for anything larger.

## Worker threads

`node:worker_threads` is for **CPU-bound** work: parsing a huge payload, image
processing, hashing, compression that has no streaming API. It is not for I/O -
I/O already happens off-thread, and a worker would only add overhead.

```js
import { Worker } from "node:worker_threads";

const result = await new Promise((resolve, reject) => {
  const worker = new Worker("./hash-worker.mjs", { workerData: payload });
  worker.on("message", resolve);
  worker.on("error", reject);
  worker.on("exit", (code) => code !== 0 && reject(new Error(`exit ${code}`)));
});
```

Workers do not share JavaScript memory: messages are structured-cloned across the
boundary, so a large payload costs a copy (`ArrayBuffer` can be *transferred*
instead, and `SharedArrayBuffer` genuinely shares). Starting one costs a few
milliseconds, so pool them rather than spawning per request.

## Summary

- Prefix builtins with `node:`.
- All paths through `node:path`; validate outside input with a
  `resolve` + `startsWith(base + sep)` containment check.
- `node:fs/promises` by default; sync only at startup; streams when the size is
  not yours to decide.
- Handle `error.code`, not error messages, and never check-then-act.
- `process.cwd()` is the caller's directory; `import.meta.dirname` is the file's.
- `execFile` with an argument array, not `exec` with an interpolated string.
- Worker threads for CPU work only - I/O is already off-thread.
