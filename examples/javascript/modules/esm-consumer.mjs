/**
 * Importing: static, namespace, dynamic - plus the ESM replacements for the
 * CommonJS globals.
 *
 * Run: node examples/javascript/modules/esm-consumer.mjs
 */

// Static imports are hoisted: every one of them is resolved and evaluated before
// any line of this file runs. That is why the "[esm-module] body evaluated"
// line below appears *before* this file's first console.log.
import createClient, { DEFAULT_TIMEOUT_MS, formatDuration, recordRequest, requestCount } from "./esm-module.mjs";

// A namespace import collects everything into one frozen object.
import * as timing from "./esm-module.mjs";

// Renaming avoids a collision without touching the exporting module.
import { formatDuration as humanise } from "./esm-module.mjs";

console.log("\nstatic imports:");
console.log("  default export ....", createClient({ timeoutMs: 1500 }).describe());
console.log("  named export ......", DEFAULT_TIMEOUT_MS);
console.log("  renamed ...........", humanise(90_000));
console.log("  namespace .........", Object.keys(timing).sort().join(", "));

// Live bindings: `requestCount` is not a snapshot taken at import time.
recordRequest();
recordRequest();
console.log("  live binding ......", requestCount, "<- updated by the exporter, not reassignable here");

// --- ESM has no __dirname / __filename / require -------------------------------

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Node 20.11+/21.2+ expose these directly - the one-liners to prefer:
const here = import.meta.dirname;
const self = import.meta.filename;

// The portable equivalents, still needed on older Node and in browsers:
const hereClassic = path.dirname(fileURLToPath(import.meta.url));

console.log("\nmodule metadata:");
console.log("  import.meta.dirname ....", path.basename(here));
console.log("  import.meta.filename ...", path.basename(self));
console.log("  fileURLToPath matches ...", here === hereClassic);

// `require` can be recreated when you need a CommonJS-only package:
const require = createRequire(import.meta.url);
const cjs = require("./cjs-module.cjs");
console.log("  createRequire ..........", cjs.formatDuration(2_500));

// --- Dynamic import(): the escape hatch from static-ness -----------------------
// It returns a promise, takes a computed specifier, and runs where you call it.
// Use it for optional dependencies, lazily-loaded heavy code, and plugin loading.

const wantsCjs = process.env.MODULE_FLAVOUR === "cjs";
const specifier = wantsCjs ? "./cjs-module.cjs" : "./esm-module.mjs";

// Top-level await is legal in ESM (and only in ESM).
const loaded = await import(specifier);

console.log("\ndynamic import:");
console.log("  specifier .........", specifier);
// A CommonJS module imported from ESM puts module.exports on `.default`; Node
// also synthesises named exports when it can statically detect them.
console.log("  interop shape .....", wantsCjs ? Object.keys(loaded.default).join(", ") : "namespace object");
console.log("  same module twice is cached:", (await import(specifier)) === loaded);

// Failing softly on an optional dependency:
const fastParser = await import("a-package-nobody-installed").catch(() => null);
console.log("  optional dependency:", fastParser ? "loaded" : "absent - falling back, not crashing");
