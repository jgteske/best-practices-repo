/**
 * The CommonJS equivalent, in a `.cjs` file so it stays CommonJS regardless of
 * the nearest package.json "type" field.
 *
 * Differences that actually matter:
 *   - `require()` is synchronous and resolved at call time, so it can sit inside
 *     an `if`. `import` is hoisted and static.
 *   - `module.exports` is a plain object assigned at runtime; there are no live
 *     bindings, so re-assigning a local variable later does not update importers.
 *   - `__dirname`, `__filename`, `require`, `module`, `exports` exist here and
 *     do NOT exist in ESM.
 */

const path = require("node:path");

const DEFAULT_TIMEOUT_MS = 5_000;

function formatDuration(ms) {
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(1)}s`;
}

// Attaching to `exports` and assigning `module.exports` are not interchangeable:
// `exports = {...}` just rebinds a local and exports nothing. Assign to
// `module.exports` (or add properties to `exports`) and nothing else.
module.exports = {
  DEFAULT_TIMEOUT_MS,
  formatDuration,
  directoryOfThisFile: path.basename(__dirname),
};

// Run directly (`node cjs-module.cjs`) rather than required? This is the CJS
// equivalent of `if __name__ == "__main__"`.
if (require.main === module) {
  console.log("[cjs-module] run directly:", module.exports.formatDuration(1500));
}
