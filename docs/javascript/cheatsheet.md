# JavaScript & Node Cheat Sheet

One-line reminders, grouped by the question you are trying to answer. Each
section links to the page with the full explanation.

## The node CLI — [details](./running-node)

```bash
node app.mjs                        # run a file
node --watch app.mjs                # re-run on change (no nodemon)
node --env-file=.env app.mjs        # load .env (no dotenv)
node --check app.mjs                # parse only, no execution
node --test                         # built-in test runner
node --test --watch                 # ...re-running on save
node --run build                    # run a package.json script, faster than npm run
node -e 'console.log(process.version)'
node --inspect-brk app.mjs          # debug, paused on line 1
node --experimental-strip-types app.ts
node --permission --allow-fs-read=./data app.mjs
```

## npm — [details](./npm-and-packages)

```bash
npm ci                              # reproducible install from the lockfile (use in CI)
npm ci --ignore-scripts             # ...without running dependency install hooks
npm install pkg@^1.2.3              # add a dependency
npm install -D pkg                  # add a devDependency
npm ls pkg                          # why is this version here?
npm outdated ; npm update           # what moved ; bump within ranges
npm audit ; npm audit fix --dry-run # advisories ; preview the fix
npm run x -- --flag                 # forward args past npm
npm pkg get scripts                 # read package.json from the CLI
npm view pkg versions --json        # every published version
npx pkg@1.2.3 --help                # one-shot tool, version pinned
npm run build --workspaces          # every workspace
```

## Values & equality — [details](./values-and-coercion)

```js
a === b                     // always; never ==
x == null                   // the one exception: null or undefined
Number.isNaN(x)             // not the global isNaN
Object.is(a, b)             // === but -0 and NaN behave
value ?? fallback           // only null/undefined (|| also catches 0 and "")
obj?.a?.[k]?.()             // short-circuits on null/undefined
Number.isInteger(n) ; Number.MAX_SAFE_INTEGER
structuredClone(obj)        // deep copy, handles Map/Set/Date/cycles
{ ...obj }                  // shallow copy, one level
```

## Scope & `this` — [details](./scope-and-closures)

```js
const / let                 // never var
() => this                  // lexical this; cannot be rebound
fn.bind(obj) ; fn.call(obj, a) ; fn.apply(obj, [a])
handler = () => { … }       // class field: bound for the instance's life
element.addEventListener("click", () => obj.method())   // not obj.method
```

## Objects & classes — [details](./objects-and-classes)

```js
Object.hasOwn(obj, key)     // not obj.hasOwnProperty(key)
Object.entries / keys / values / fromEntries
Object.freeze(obj)          // shallow
class A { #priv; static #s; get x() {} }
Object.create(null)         // a lookup table with no inherited keys
```

## Arrays & collections — [details](./arrays-and-iteration)

```js
arr.map / filter / find / some / every / flatMap
arr.reduce((acc, x) => …, initial)   // always pass the initial value
arr.at(-1)                           // last element
arr.toSorted((a, b) => a - b)        // copy; sort() mutates and compares strings
arr.toReversed() / toSpliced() / with(i, v)
Object.groupBy(items, (x) => x.kind) // Node 21+
new Map() / new Set()                // keys by identity, insertion order, .size
new WeakMap()                        // metadata on objects you do not own
[...new Set(arr)]                    // dedupe
function* gen() { yield 1; yield* other(); }
```

## Modules — [details](./modules-esm-and-cjs)

```js
import { a } from "./m.mjs"          // hoisted, static, live bindings
import * as ns from "./m.mjs"
const m = await import(specifier)    // computed / conditional / optional
import.meta.dirname                  // __dirname (Node 20.11+)
import.meta.filename                 // __filename
createRequire(import.meta.url)       // require() a CJS-only package
```

```jsonc
// package.json
{ "type": "module", "exports": { ".": "./dist/index.js" } }
```

## Async — [details](./event-loop-and-async)

```js
await Promise.all(items.map(work))       // concurrent; await-in-a-loop is not
await Promise.allSettled(promises)       // never rejects
await Promise.race([p, delay(ms)])       // first to settle
await Promise.any(mirrors)               // first to succeed
AbortSignal.timeout(2_000)               // the whole of request timeouts
AbortSignal.any([userSignal, timeout])   // whichever fires first
new Error("context", { cause: original }) // keep the original
return await promise                     // inside try/catch - `return promise` escapes it
for await (const item of asyncGenerator()) …
queueMicrotask(fn)                       // portable; nextTick ordering is not
import { setTimeout as delay } from "node:timers/promises";
```

## Files & paths — [details](./core-apis)

```js
import { readFile, writeFile, mkdir, readdir, rm, mkdtemp, stat } from "node:fs/promises";
path.join(a, b) ; path.resolve(a, b) ; path.parse(p) ; path.sep
full.startsWith(base + path.sep)         // traversal containment check
await mkdir(p, { recursive: true })      // idempotent
await readdir(p, { withFileTypes: true })
await rm(p, { recursive: true, force: true })
await mkdtemp(path.join(tmpdir(), "x-")) // safe temp dir
if (error.code !== "ENOENT") throw error // branch on code, not message
new URL(href, base) ; url.searchParams.set(k, v)
```

## Process — [details](./running-node)

```js
parseArgs({ options: { name: { type: "string", short: "n" } } })  // node:util
process.env.X ?? "default"               // always a string or undefined
process.exitCode = 1                     // not process.exit()
process.cwd()                            // the caller's dir, not the script's
process.hrtime.bigint()                  // monotonic ns for durations
execFile("git", ["log", arg])            // never exec with an interpolated string
```

## Streams — [details](./streams-and-buffers)

```js
await pipeline(src, transform, dest)     // node:stream/promises; never .pipe() chains
for await (const chunk of readable) …    // backpressure handled for you
createInterface({ input, crlfDelay: Infinity })   // line by line
Readable.from(asyncGenerator())          // any iterable becomes a stream
Readable.fromWeb(response.body)          // bridge from fetch
Buffer.byteLength(str)                   // bytes, not characters
```

## HTTP — [details](./http-and-networking)

```js
const url = new URL(request.url, `http://${request.headers.host}`);
response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
server.listen(0)                         // OS-assigned port, right for tests
server.close() ; server.closeIdleConnections()
const r = await fetch(url, { signal: AbortSignal.timeout(5_000) });
if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);  // fetch does NOT throw on 4xx/5xx
await r.body?.cancel()                   // release the socket if you skip the body
```

## Shutdown — [details](./errors-and-shutdown)

```js
process.on("SIGTERM", () => void shutdown("SIGTERM"));   // what orchestrators send
process.on("uncaughtException", …)       // log and die, never recover
process.on("unhandledRejection", …)
if (shuttingDown) return;                // signals arrive more than once
setTimeout(force, 5_000).unref()         // drain deadline that does not hold the loop
```

## Testing — [details](./testing-with-node-test)

```js
import test, { describe, it, before, mock } from "node:test";
import assert from "node:assert/strict";  // strict: equal is ===

assert.deepEqual(actual, expected)        // whole objects, one failure message
assert.throws(fn, MyError)                // type, not message text
await assert.rejects(fn, MyError)         // must be awaited
const spy = mock.fn(impl); spy.mock.callCount(); spy.mock.calls[0].arguments;
test("later", { todo: "reason" }, () => {});
```

```bash
node --test --experimental-test-coverage
node --test --test-name-pattern="cart"
```

## Exit codes — [details](./running-node#exit-codes)

| Code | Means |
| --- | --- |
| `0` | success |
| `1` | generic failure (uncaught exception) |
| `64` | `EX_USAGE` - bad arguments |
| `78` | `EX_CONFIG` - bad configuration |
| `130` / `143` | killed by SIGINT / SIGTERM |
