# ESM vs CommonJS

Node has two module systems. ES modules (`import`/`export`) are the standard and
the default for new code; CommonJS (`require`/`module.exports`) predates them and
still runs most of npm. You will meet both, often in the same dependency tree, so
the useful knowledge is: which one a file is, what each can do, and what happens
when they meet.

## Writing an ES module

<<< ../../examples/javascript/modules/esm-module.mjs{js}

Three properties of that file are worth stating explicitly.

**The body runs once per process.** The first `import` of a module evaluates it;
every later import - from anywhere, by any path that resolves to the same file -
gets the cached result. A top-level `const pool = createPool()` is therefore a
shared singleton, not a new pool per importer. That is a feature when you want a
connection pool and a trap when you want per-caller state.

**Exports are live bindings, not copies.** `requestCount` is exported as a
binding: when `recordRequest()` reassigns it inside the module, importers see the
new value. They cannot assign to it themselves - imported names are read-only.

**Named exports beat default exports.** A default export has no name at the
import site, so every importer may call it something different, and a typo in a
named import is caught at load time while a wrong default is not. Keep `default`
for the one obvious thing a module *is*.

## Importing

<<< ../../examples/javascript/modules/esm-consumer.mjs{js}

```
[esm-module] body evaluated (you will see this exactly once)

static imports:
  default export .... client(1.5s)
  named export ...... 5000
  renamed ........... 90.0s
  namespace ......... DEFAULT_TIMEOUT_MS, default, formatDuration, recordRequest, requestCount
  live binding ...... 2 <- updated by the exporter, not reassignable here
```

Notice the first line: the exporter's body ran **before** the consumer's first
`console.log`. Static imports are hoisted and the whole graph is resolved and
evaluated before any of the importing file executes. You cannot put an `import`
inside an `if`, and you cannot compute its specifier.

| Form | Use it for |
| --- | --- |
| `import { a, b } from "./m.mjs"` | the normal case |
| `import { a as alias } from …` | avoiding a collision without touching the exporter |
| `import def from …` | the module's one primary export |
| `import * as ns from …` | grabbing everything into a frozen namespace object |
| `import "./m.mjs"` | side effects only - registering something, polyfills |
| `await import(spec)` | a computed or conditional specifier (see below) |

## The ESM replacements for the CommonJS globals

`__dirname`, `__filename`, `require`, `module`, and `exports` **do not exist** in
an ES module. The replacements:

| CommonJS | ESM |
| --- | --- |
| `__dirname` | `import.meta.dirname` (Node 20.11+) |
| `__filename` | `import.meta.filename` (Node 20.11+) |
| — | `import.meta.url` - the file URL, works everywhere including browsers |
| `require("pkg")` | `import` - or `createRequire(import.meta.url)` when a package is CJS-only |
| `require.main === module` | `import.meta.url === pathToFileURL(process.argv[1]).href` |

```
module metadata:
  import.meta.dirname .... modules
  import.meta.filename ... esm-consumer.mjs
  fileURLToPath matches ... true
  createRequire .......... 2.5s
```

Before Node 20.11 the idiom was
`path.dirname(fileURLToPath(import.meta.url))`; it still works and is the
portable form, but there is no reason to type it on a current runtime.

## Dynamic `import()`

`import(specifier)` is a function-like form that returns a promise for the module
namespace. It is the escape hatch from everything static imports enforce:

- the specifier can be **computed** at runtime;
- it can sit inside an `if`, a `try`, or a function;
- it defers loading until the moment of use, which matters for a heavy optional
  dependency or a plugin discovered from config.

```
dynamic import:
  specifier ......... ./esm-module.mjs
  interop shape ..... namespace object
  same module twice is cached: true
  optional dependency: absent - falling back, not crashing
```

Two behaviours the example demonstrates: the module cache applies, so importing
the same specifier twice returns the identical namespace object; and a failed
import rejects like any promise, so an optional dependency can be `.catch`ed into
a `null` rather than crashing the process.

::: tip Top-level `await` is ESM-only
`await` at module scope is legal in an ES module and a syntax error in CommonJS.
It delays the evaluation of every module that imports you, so it is right for
"read config once at startup" and wrong for anything that might hang.
:::

## CommonJS

<<< ../../examples/javascript/modules/cjs-module.cjs{js}

The differences that actually bite:

| | CommonJS | ESM |
| --- | --- | --- |
| Loading | synchronous, at call time | asynchronous, hoisted, statically resolved |
| Conditional load | `if (x) require("y")` works | needs `await import()` |
| Exports | a plain object, copied at access time | live bindings |
| Circular imports | you may see a half-built `exports` object | hoisted bindings, TDZ errors instead of silent `undefined` |
| Top-level `await` | syntax error | supported |
| Directory/extensionless specifiers | `require("./util")` resolves `util.js`, `util/index.js` | must write the full `./util.js` |
| Strict mode | opt in with `"use strict"` | always on |
| `this` at module scope | `module.exports` | `undefined` |

::: warning `exports = {…}` exports nothing
`exports` is just a local variable initially pointing at `module.exports`.
Reassigning it rebinds the local and the module exports the original empty
object. Assign to **`module.exports`**, or add properties to `exports` - never
both in one file.
:::

## Which system is a file in?

Node decides per file, by this order:

1. **`.mjs`** → always ESM. **`.cjs`** → always CommonJS.
2. **`.js`** → whatever the nearest parent `package.json` says: `"type": "module"`
   means ESM, `"type": "commonjs"` or no field at all means CommonJS.

Set `"type": "module"` in a new package and write plain `.js`. Use the explicit
extensions when a single package genuinely needs both - a CJS build entry point
alongside ESM source, say. The examples in this guide use `.mjs`/`.cjs`
throughout precisely so no page has to explain which `package.json` applies.

## Interop, in both directions

**ESM importing CommonJS** works. `module.exports` arrives as the `default`
export, and Node additionally synthesises named exports when it can statically
detect simple assignments:

```
  interop shape ..... DEFAULT_TIMEOUT_MS, formatDuration, directoryOfThisFile
```

Do not rely on the synthesis for a package that builds its exports dynamically -
`import pkg from "cjs-pkg"` and destructure from `pkg` is the form that always
works.

**CommonJS importing ESM** was the long-standing hard direction: `require()` is
synchronous and ESM evaluation is asynchronous. Node 22.12+ can `require()` an ES
module that has no top-level `await`; for anything older, or anything with
top-level `await`, the escape is `await import()` inside an `async` function.

## The `exports` map

`package.json`'s `exports` field defines a package's public surface. It replaced
the old `main` field and does two jobs at once - declaring entry points and
**blocking deep imports** into files you did not intend to publish:

```json
{
  "name": "my-lib",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js"
  }
}
```

With that in place `import "my-lib/dist/internal.js"` fails - which is what lets
you refactor internals without a major version. A dual package adds conditions:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

Conditions are matched top to bottom, so `types` must come first and a `default`
key, if present, must come last. More on the surrounding fields in
[npm & package.json](./npm-and-packages), and on building the whole map -
subpaths, `imports`, and the dual-package hazard that shape above invites - in
[Creating & Publishing a Package](./creating-packages).

## Summary

- `.mjs` is always ESM, `.cjs` always CommonJS, `.js` follows the nearest
  `package.json` `"type"`.
- A module body evaluates once per process; its exports are live bindings.
- Static imports are hoisted and resolved before any of your code runs; use
  `await import()` when the specifier is computed, conditional, or optional.
- `import.meta.dirname`/`filename` replace `__dirname`/`__filename`;
  `createRequire` covers a CJS-only package.
- ESM can import CJS (via `default`, plus synthesised names); `require()` of ESM
  needs Node 22.12+ and no top-level `await`.
- Prefer named exports, and define a package's surface with `exports` so deep
  imports cannot ossify into a contract.
