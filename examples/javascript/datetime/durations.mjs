/**
 * Measuring durations, injecting a clock for tests, and where Temporal fits.
 *
 * Run: node examples/javascript/datetime/durations.mjs
 */

import assert from "node:assert/strict";

// #region elapsed
// Date.now() is wall-clock time and can jump (NTP, the user changing the clock).
// performance.now() is monotonic, sub-millisecond, and only meaningful as a difference.
const start = performance.now();
for (let i = 0; i < 100_000; i += 1);
const elapsedMs = performance.now() - start;
assert.ok(elapsedMs >= 0);
// #endregion elapsed

// #region injectable-clock
/** A session that reads time through `now`, so a test can control it. */
function createSession({ ttlMs, now = Date.now }) {
  const created = now();
  return { expired: () => now() - created >= ttlMs };
}

let fakeNow = Date.UTC(2026, 0, 1);
const session = createSession({ ttlMs: 30 * 60_000, now: () => fakeNow });
fakeNow += 29 * 60_000;
assert.equal(session.expired(), false);
fakeNow += 60_000;
assert.equal(session.expired(), true);
console.log("session expired after exactly 30 fake minutes");
// (node:test's mock.timers can also fake Date - see the testing page.)
// #endregion injectable-clock

// #region temporal
// Temporal is the replacement for Date: immutable values, separate types for an
// instant, a wall-clock date-time and a zoned date-time, and real calendar math.
// Feature-detect it until your runtimes all ship it.
if (typeof globalThis.Temporal !== "undefined") {
  const { Temporal } = globalThis;
  const jan31 = Temporal.PlainDate.from("2026-01-31");
  console.log(`Temporal: ${jan31.add({ months: 1 }).toString()}`); // 2026-02-28 - clamped, no rollover
} else {
  console.log("Temporal: not available in this runtime");
}
// #endregion temporal
