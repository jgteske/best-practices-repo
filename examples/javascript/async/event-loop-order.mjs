/**
 * What actually runs when: synchronous code, then microtasks, then macrotasks.
 *
 * Run: node examples/javascript/async/event-loop-order.mjs
 *
 * The rule that explains the output:
 *   1. Run the current synchronous script to completion.
 *   2. Drain the ENTIRE microtask queue (promise callbacks, queueMicrotask,
 *      process.nextTick), including microtasks queued by other microtasks.
 *   3. Run the next phase of macrotasks (timers, I/O callbacks, setImmediate).
 *   4. Drain the microtask queue again. Repeat forever.
 *
 * "Asynchronous" never means "in parallel" - it means "queued for later on this
 * same single thread". A synchronous loop that takes 2s blocks every one of these.
 */

const order = [];
const record = (label) => order.push(label);

record("sync: script start");

setTimeout(() => record("macrotask: setTimeout(fn, 0)"), 0);
setImmediate(() => record("macrotask: setImmediate"));

Promise.resolve().then(() => record("microtask: promise.then"));
queueMicrotask(() => record("microtask: queueMicrotask"));
process.nextTick(() => record("microtask: process.nextTick"));

record("sync: script end");

setTimeout(() => {
  console.log("actual execution order:");
  order.forEach((label, index) => console.log(`  ${index + 1}. ${label}`));

  console.log(`
Two things in that list are worth knowing:

  * Both synchronous lines run before any callback, even the promise that was
    already resolved. A resolved promise still costs you a trip to the queue.
  * setTimeout(fn, 0) and setImmediate() race when they are scheduled from the
    main module - the order between those two is genuinely not guaranteed.
    Inside an I/O callback, setImmediate always wins.

process.nextTick has its own queue, drained before the promise microtasks - but
only in CommonJS. A top-level ESM body is itself evaluated inside a microtask, so
promise callbacks queued there are already pending when nextTick's queue is
reached, and nextTick appears last. Do not build ordering on it: reach for
queueMicrotask, which behaves the same everywhere.`);

  starvation();
}, 10);

// --- Blocking the loop ----------------------------------------------------------

function starvation() {
  console.log("\nblocking the only thread:");

  const queuedAt = Date.now();
  setTimeout(() => {
    // The timer asked for 0ms but could not fire until the synchronous loop below
    // gave the thread back. A delay argument is a *minimum*, never a promise.
    console.log(`  a 0ms timer actually fired after ~${Date.now() - queuedAt}ms,`);
    console.log("  because a synchronous loop held the only thread the whole time.");
  }, 0);

  const busyUntil = Date.now() + 50;
  while (Date.now() < busyUntil) {
    // Deliberate CPU burn - stand in for parsing a 50MB JSON file, hashing a
    // password, or sorting a huge array. In a server this is 50ms in which
    // *every* other request is stalled, not just this one.
  }

  // Fixes, in order of preference: use the async API instead (fs/promises, not
  // fs.readFileSync); move the work off-thread (node:worker_threads, or a child
  // process); or chunk it and yield with `await delay(0)` between slices.
}
