/**
 * A plain ES module: named exports, one default, and side effects at load time.
 *
 * The body of a module runs exactly once per process, the first time anything
 * imports it. Every later import gets the same live binding - modules are
 * singletons, which is what makes a top-level `const pool = createPool()` a
 * shared connection pool rather than a new one per importer.
 */

console.log("[esm-module] body evaluated (you will see this exactly once)");

// Named exports: the readable default. They are statically analysable, so
// tooling can tree-shake and a typo is caught at load time, not at runtime.
export const DEFAULT_TIMEOUT_MS = 5_000;

export function formatDuration(ms) {
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(1)}s`;
}

// Exports are *live bindings*, not copies: importers see later reassignments.
export let requestCount = 0;
export function recordRequest() {
  requestCount += 1;
}

// A default export has no name at the import site, so every importer may call it
// something different. Prefer named exports; keep `default` for the one obvious
// thing a module is (a React component, a config object).
export default function createClient({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return { timeoutMs, describe: () => `client(${formatDuration(timeoutMs)})` };
}
