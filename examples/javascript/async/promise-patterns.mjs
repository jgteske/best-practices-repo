/**
 * Promises and async/await: the patterns, and the three ways people lose errors.
 *
 * Run: node examples/javascript/async/promise-patterns.mjs
 */

import { setTimeout as delay } from "node:timers/promises";

const fakeFetch = async (name, ms, { fail = false } = {}) => {
  await delay(ms);
  if (fail) throw new Error(`${name} failed`);
  return `${name}@${ms}ms`;
};

// --- Sequential vs concurrent ---------------------------------------------------
// `await` in a loop means "wait for each one". If the calls do not depend on each
// other, that is pure latency you are paying for nothing.

console.log("sequential vs concurrent:");

const sequentialStart = Date.now();
const sequential = [];
for (const ms of [60, 60, 60]) {
  sequential.push(await fakeFetch("seq", ms));
}
console.log(`  three 60ms calls in a for-await loop: ~${Date.now() - sequentialStart}ms`);

const concurrentStart = Date.now();
const concurrent = await Promise.all([60, 60, 60].map((ms) => fakeFetch("par", ms)));
console.log(`  the same three via Promise.all:      ~${Date.now() - concurrentStart}ms`);
console.log("  results:", concurrent.length, "===", sequential.length);

// --- Choosing a combinator -------------------------------------------------------

console.log("\ncombinators:");

// all: fail fast. One rejection rejects the whole thing, and the other work keeps
// running in the background - it is not cancelled, just ignored.
try {
  await Promise.all([fakeFetch("a", 10), fakeFetch("b", 20, { fail: true })]);
} catch (error) {
  console.log("  Promise.all rejected with:", error.message);
}

// allSettled: never rejects. You get a tagged result per input and decide.
const settled = await Promise.allSettled([
  fakeFetch("ok", 10),
  fakeFetch("bad", 10, { fail: true }),
]);
for (const result of settled) {
  console.log(
    "  allSettled ->",
    result.status === "fulfilled" ? `fulfilled: ${result.value}` : `rejected: ${result.reason.message}`,
  );
}

// race: first to *settle* wins, success or failure. The classic timeout.
const raced = await Promise.race([fakeFetch("slow", 100), delay(20, "timed out")]);
console.log("  Promise.race ->", raced);

// any: first to *succeed* wins; rejects with an AggregateError only if all fail.
const anyResult = await Promise.any([
  fakeFetch("mirror-1", 40, { fail: true }),
  fakeFetch("mirror-2", 15),
]);
console.log("  Promise.any  ->", anyResult);

// --- Cancellation: AbortSignal is the standard, and it composes ------------------

console.log("\ncancellation:");

const controller = new AbortController();
setTimeout(() => controller.abort(new Error("user navigated away")), 20);

try {
  await delay(200, undefined, { signal: controller.signal });
} catch (error) {
  console.log("  aborted:", error.cause?.message ?? error.message);
}

// AbortSignal.timeout is the one-liner for "give up after N ms" - the same
// signal a fetch() call takes, so `fetch(url, { signal: AbortSignal.timeout(30) })`
// is the whole of request timeouts. AbortSignal.any combines several reasons to stop.
const userCancelled = new AbortController();
const giveUp = AbortSignal.any([userCancelled.signal, AbortSignal.timeout(30)]);

try {
  await delay(500, undefined, { signal: giveUp });
} catch (error) {
  console.log("  combined signal fired:", error.name, "<- whichever reason came first");
}

// --- Three ways to lose an error --------------------------------------------------

console.log("\nlosing errors:");

// 1. A floating promise: not awaited, not returned, no .catch(). The rejection
//    escapes to the process-level handler with no useful stack.
const floating = fakeFetch("floating", 5, { fail: true });
floating.catch((error) => console.log("  1. floating promise, caught late:", error.message));

// 2. An async callback passed to a non-promise-aware API. forEach ignores the
//    returned promise entirely, so this "loop" finishes before any work does -
//    and a rejection inside it becomes an unhandled rejection.
const viaForEach = [];
[30, 10].forEach(async (ms) => {
  await delay(ms);
  viaForEach.push(ms);
});
console.log("  2. forEach + async callback returned with nothing done:", JSON.stringify(viaForEach));

// The fix is for...of (sequential) or Promise.all(map) (concurrent):
const viaPromiseAll = [];
await Promise.all([30, 10].map(async (ms) => {
  await delay(ms);
  viaPromiseAll.push(ms);
}));
console.log("     Promise.all(map) waited:", JSON.stringify(viaPromiseAll), "<- push order is completion order");

// 3. try/catch that does not cover the await. `return somePromise` inside a try
//    block resolves *outside* the try unless you `return await`.
async function swallowed() {
  try {
    return fakeFetch("inner", 5, { fail: true }); // no await: catch never sees it
  } catch {
    return "caught (this never happens)";
  }
}
try {
  await swallowed();
} catch (error) {
  console.log("  3. `return promise` skipped its own try/catch:", error.message);
}

// --- Wrapping the error instead of erasing it -------------------------------------

async function loadProfile(id) {
  try {
    return await fakeFetch(`profile-${id}`, 5, { fail: true });
  } catch (error) {
    // `cause` keeps the original error and its stack attached.
    throw new Error(`could not load profile ${id}`, { cause: error });
  }
}

try {
  await loadProfile(7);
} catch (error) {
  console.log("\nerror chaining:");
  console.log("  outer:", error.message);
  console.log("  cause:", error.cause.message);
}
