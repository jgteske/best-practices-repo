# JavaScript & Node.js

The language everything else on this site is built on, and the runtime that
executes it outside a browser. This guide covers native JavaScript - values,
scope, objects, iteration, modules, the event loop - and then Node itself: the
CLI, npm, the core APIs, streams, HTTP, process lifecycle, and the built-in test
runner.

Every example on these pages is a real `.mjs` or `.cjs` file under
[`examples/javascript`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript),
imported directly into the page. `npm run check:js` parses each one with
`node --check`, **then actually executes it** and fails on a non-zero exit, and
finally runs the `node:test` suite - so the output printed in the prose below is
output the code really produced, not output somebody typed by hand.

::: tip Part of the JavaScript & TypeScript section
This guide is one of three, along with [TypeScript](../typescript/) and [React](../react/).
The sidebar groups the pages from all three by topic, so the JavaScript, TypeScript
and React pages on classes, errors or async work sit next to each other.
:::

## What's covered

<div class="vp-doc">

**The language**

| Page | Focus |
| --- | --- |
| [Values, Types & Coercion](./values-and-coercion) | Primitives vs objects, `==` vs `===`, `null` vs `undefined`, truthiness, `NaN`, float precision, and copying. |
| [Scope, Closures & `this`](./scope-and-closures) | `var`/`let`/`const`, hoisting and the TDZ, closures, and what `this` binds to in every call form. |
| [Functions, Arrows & Composition](./functions-and-composition) | How `a => b => c` parses, currying and partial application, `pipe`/`compose`, wrapper chains, and passing functions as arguments. |
| [Objects, Prototypes & Classes](./objects-and-classes) | The prototype chain, what `class` desugars to, `#private`, getters, `Object.freeze`, `?.` and `??`. |
| [Classes at Runtime](./classes-at-runtime) | The order initializers really run in, how `this` is lost, `super` and `new.target`, `#field in obj` brand checks, static blocks, and mixins. |
| [Arrays, Iteration & Collections](./arrays-and-iteration) | `map`/`filter`/`reduce`, destructuring and spread, `Map`/`Set`/`WeakMap`, iterators and generators. |

**Modules & async**

| Page | Focus |
| --- | --- |
| [ESM vs CommonJS](./modules-esm-and-cjs) | `import`/`export`, `"type": "module"`, `.mjs`/`.cjs`, dynamic `import()`, the interop rules, and the `exports` map. |
| [The Event Loop & Promises](./event-loop-and-async) | Microtasks vs macrotasks, promise patterns, `AbortSignal`, async iterators, and the three ways people lose an error. |
| [Promise Queues & Concurrency Limits](./promise-queues) | Why `Promise.all(map)` has no ceiling, a ~40-line queue, ordered results, abort, and `concurrency: 1` as a mutex. |
| [Timers, Rate Limits & Scheduling](./timers-and-scheduling) | Which repeating timer drifts, intervals that overlap async work, debounce vs throttle vs rate limit, time-window vs token-bucket limiters, backoff with jitter, and deadlines. |

**The Node runtime**

| Page | Focus |
| --- | --- |
| [Running Node](./running-node) | Installing and pinning versions, the CLI flags worth knowing, `--watch`, `--env-file`, arguments, and exit codes. |
| [Core APIs](./core-apis) | `node:fs/promises`, `node:path`, `process`, `node:os`, child processes, and worker threads. |
| [Streams & Buffers](./streams-and-buffers) | Why streams exist, `pipeline()`, async iteration, backpressure, and `Buffer` vs `TypedArray`. |
| [HTTP & Networking](./http-and-networking) | A `node:http` server, body parsing and limits, the global `fetch`, timeouts, and when a framework earns its keep. |
| [Errors & Graceful Shutdown](./errors-and-shutdown) | Custom errors and `cause`, `unhandledRejection`, signal handling, draining connections, and exit codes. |
| [Testing with `node:test`](./testing-with-node-test) | The built-in runner, `assert/strict`, mocking, coverage, and what makes code testable in the first place. |

**Packages & dependencies**

| Page | Focus |
| --- | --- |
| [npm, package.json & Semver](./npm-and-packages) | The overview: every field that matters, `install` vs `ci`, scripts, `npx`, workspaces, and dependency hygiene. |
| [Creating & Publishing a Package](./creating-packages) | Scopes, `exports` and conditions, shipping types, the dual-package hazard, what lands in the tarball, dist-tags, provenance, and testing before you publish. |
| [Version Ranges In Depth](./version-ranges) | The whole range grammar, `^` below 1.0.0, why prereleases are opt-in, precedence, non-registry specifiers, and which range to pick where. |
| [How Dependencies Get Resolved](./dependency-resolution) | Node's `node_modules` walk, hoisting vs nesting, the diamond conflict, what two copies of a package break, `ERESOLVE` and `overrides`, the lockfile, and npm vs pnpm layouts. |

**Reference**

| Page | Focus |
| --- | --- |
| [Cheat Sheet](./cheatsheet) | One-line reminders for the node CLI, npm, and the core-API idioms, grouped by task. |

</div>

## What these pages assume

- **Node 22 LTS or newer.** A few things used here landed recently:
  `Object.groupBy` (21), `import.meta.dirname` (20.11), `AbortSignal.any` (20.3),
  and glob arguments for `node --test` (21). Where a feature is newer than the
  baseline it is called out inline.
- **ES modules.** Examples use `import`/`export` and `.mjs`; the
  [ESM vs CommonJS](./modules-esm-and-cjs) page covers `require` and the interop
  rules for the CommonJS code you will still meet in the wild.
- **`node:` prefixed builtins.** `import fs from "node:fs/promises"` rather than
  `"fs"`. The prefix cannot be shadowed by a package of the same name from npm,
  and it makes builtins obvious at a glance.

::: tip Looking for the typed layer?
This guide deliberately stops at plain JavaScript. Types, generics, discriminated
unions, and `Result` error handling live in the
[TypeScript guide](/typescript/) - and everything there compiles down to the
language described here. The two pages worth reading side by side are
[Async & Promise Patterns](/typescript/async-and-promises) and
[Cancellation & AbortSignal](/typescript/cancellation-and-signals).
:::

## The three things that explain most JavaScript surprises

**1. Values are copied; objects are shared.** Assigning an object copies the
*reference*, so two names point at one thing. A spread copies one level deep and
no further. [Values & Coercion](./values-and-coercion) has the demonstration.

**2. There is one thread.** `async` does not mean parallel - it means "queued
for later on the same thread". Any synchronous work you do blocks every timer,
every callback, and every other request. [The Event Loop](./event-loop-and-async)
shows a 0ms timer firing 50ms late for exactly this reason.

**3. `this` depends on how a function is called, not where it was defined** -
unless it is an arrow function, which captures `this` from its surrounding scope
instead. [Scope, Closures & `this`](./scope-and-closures) walks through every
call form.
