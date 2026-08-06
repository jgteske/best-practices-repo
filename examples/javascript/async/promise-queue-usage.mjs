/**
 * The promise queue in use: what it actually buys you, measured.
 *
 * Run: node examples/javascript/async/promise-queue-usage.mjs
 */

import { setTimeout as delay } from "node:timers/promises";
import { PromiseQueue, mapConcurrent, mapSettled } from "./promise-queue.mjs";

// A worker that reports how many copies of itself are running at once.
const createTrackedWorker = (ms = 20) => {
  const state = { inFlight: 0, maxInFlight: 0, started: 0 };
  const work = async (item) => {
    state.started += 1;
    state.inFlight += 1;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    try {
      await delay(ms);
      return `item-${item}`;
    } finally {
      state.inFlight -= 1;
    }
  };
  return { work, state };
};

const items = Array.from({ length: 24 }, (_, i) => i);

// --- 1. The problem: map() has no ceiling -----------------------------------------

console.log("unbounded vs queued (24 tasks, 20ms each):");

const unbounded = createTrackedWorker();
const unboundedStart = Date.now();
await Promise.all(items.map(unbounded.work));
console.log(
  `  Promise.all(map):     max in flight ${unbounded.state.maxInFlight}, ~${Date.now() - unboundedStart}ms`,
);

const queued = createTrackedWorker();
const queuedStart = Date.now();
await mapConcurrent(items, queued.work, { concurrency: 4 });
console.log(`  queue, concurrency 4: max in flight ${queued.state.maxInFlight}, ~${Date.now() - queuedStart}ms`);

const queuedWide = createTrackedWorker();
const wideStart = Date.now();
await mapConcurrent(items, queuedWide.work, { concurrency: 8 });
console.log(`  queue, concurrency 8: max in flight ${queuedWide.state.maxInFlight}, ~${Date.now() - wideStart}ms`);
console.log("  the queue trades wall time for a bound on resources - that is the whole deal");

// --- 2. Results stay in input order ------------------------------------------------

console.log("\ncompletion order is not result order:");

const completed = [];
const durations = [50, 10, 40, 5, 30, 15];
const ordered = await mapConcurrent(
  durations,
  async (ms, index) => {
    await delay(ms);
    completed.push(index);
    return `#${index} (${ms}ms)`;
  },
  { concurrency: 3 },
);
console.log("  finished in order:", JSON.stringify(completed));
console.log("  results returned: ", ordered.join(", "));

// --- 3. A rejection does not stop the queue ----------------------------------------

console.log("\none task fails:");

const flaky = async (n) => {
  await delay(10);
  if (n === 2) throw new Error(`task ${n} failed`);
  return n * 10;
};

let ranAnyway = 0;
try {
  await mapConcurrent(
    [0, 1, 2, 3, 4, 5],
    async (n) => {
      const result = await flaky(n);
      ranAnyway += 1;
      return result;
    },
    { concurrency: 2 },
  );
} catch (error) {
  console.log("  mapConcurrent rejected with:", error.message);
}
await delay(50); // let the queue finish draining
console.log(`  ...but ${ranAnyway} other tasks still ran to completion - rejecting is not cancelling`);

const settled = await mapSettled([0, 1, 2, 3, 4, 5], flaky, { concurrency: 2 });
console.log(
  "  mapSettled kept the successes:",
  JSON.stringify(settled.map((r) => (r.status === "fulfilled" ? r.value : "ERR"))),
);

// --- 4. Aborting drops what has not started yet ------------------------------------

console.log("\nabort mid-run:");

const cancelled = createTrackedWorker(30);
const controller = new AbortController();
setTimeout(() => controller.abort(new Error("user cancelled")), 45);

const results = await mapSettled(items, cancelled.work, {
  concurrency: 2,
  signal: controller.signal,
});
const rejected = results.filter((r) => r.status === "rejected").length;
console.log(`  ${cancelled.state.started} of ${items.length} tasks ever started`);
console.log(`  ${rejected} were dropped while still queued, reason:`, results.at(-1).reason.message);

// --- 5. concurrency: 1 is a mutex --------------------------------------------------

console.log("\nconcurrency 1 = a serial queue (the fix for interleaved writes):");

// A read-modify-write with an await in the middle: every caller reads the same
// value before any of them writes, so four increments produce one.
let account = 0;
const deposit = async (amount) => {
  const balance = account;
  await delay(5); // a real read/write round-trip goes here
  account = balance + amount;
};

await Promise.all([1, 2, 3, 4].map(deposit));
console.log(`  four unqueued deposits of 1,2,3,4 -> balance ${account} (expected 10): lost updates`);

account = 0;
const serial = new PromiseQueue({ concurrency: 1 });
await Promise.all([1, 2, 3, 4].map((amount) => serial.add(() => deposit(amount))));
console.log(`  the same four through concurrency: 1 -> balance ${account}`);

// --- 6. Waiting for a queue you did not keep the promises for ----------------------

console.log("\nfire-and-forget with a drain point:");

const background = new PromiseQueue({ concurrency: 3 });
for (const item of items.slice(0, 9)) {
  // Nothing awaits these individually; onIdle() is the join point.
  void background.add(async () => {
    await delay(10);
    return item;
  });
}
console.log(`  queued 9 jobs -> running ${background.running}, pending ${background.pending}`);
await background.onIdle();
console.log(`  after onIdle() -> running ${background.running}, pending ${background.pending}`);
