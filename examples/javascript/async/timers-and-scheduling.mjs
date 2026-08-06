/**
 * Timers: drift, overlap, and the difference between debouncing, throttling and
 * rate limiting.
 *
 * A delay argument is a MINIMUM, not a schedule. Everything on this page follows
 * from that one fact: repeated timers drift, slow work overlaps the next tick,
 * and anything that must stay in sync with wall-clock time has to derive its
 * value from the clock rather than count its own ticks.
 *
 * Run: node examples/javascript/async/timers-and-scheduling.mjs
 */

import { setTimeout as delay } from "node:timers/promises";

/** Burn the thread for `ms` - stands in for parsing, hashing, layout, rendering. */
const busy = (ms) => {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* deliberately blocking */
  }
};

const PERIOD = 20;
const TICKS = 10;
const WORK = 6;

// --- 1. Which repeating timer drifts ----------------------------------------------

console.log(`${TICKS} ticks of ${PERIOD}ms, each doing ${WORK}ms of work (ideal: ${TICKS * PERIOD}ms):`);

// setInterval schedules on a fixed grid: the runtime knows when the tick was
// *due*, so work inside the callback is absorbed rather than added on - as long
// as the callback is shorter than the period.
const intervalEnd = await new Promise((resolve) => {
  const start = performance.now();
  let tick = 0;
  const id = setInterval(() => {
    tick += 1;
    busy(WORK);
    if (tick === TICKS) {
      clearInterval(id);
      resolve(performance.now() - start);
    }
  }, PERIOD);
});
console.log(`  setInterval:            ~${Math.round(intervalEnd)}ms  (drift +${Math.round(intervalEnd - TICKS * PERIOD)}ms)`);

// The naive recursive timeout is the one that drifts: it asks for a full period
// AFTER the work is done, so every tick is late by the work it just did, and
// the error accumulates for as long as the loop runs.
const chainedEnd = await new Promise((resolve) => {
  const start = performance.now();
  let tick = 0;
  const loop = () => {
    tick += 1;
    busy(WORK);
    if (tick === TICKS) resolve(performance.now() - start);
    else setTimeout(loop, PERIOD);
  };
  setTimeout(loop, PERIOD);
});
console.log(`  chained setTimeout:     ~${Math.round(chainedEnd)}ms  (drift +${Math.round(chainedEnd - TICKS * PERIOD)}ms)`);

// The fix: schedule against the ORIGINAL start time, not against "now". Each
// timeout asks for however long is left until the next scheduled instant, so a
// slow tick shortens the next wait instead of pushing everything back.
const correctedEnd = await new Promise((resolve) => {
  const start = performance.now();
  let tick = 0;
  const scheduleNext = () => {
    const target = start + (tick + 1) * PERIOD;
    setTimeout(() => {
      tick += 1;
      busy(WORK);
      if (tick === TICKS) resolve(performance.now() - start);
      else scheduleNext();
    }, Math.max(0, target - performance.now()));
  };
  scheduleNext();
});
console.log(`  self-correcting chain:  ~${Math.round(correctedEnd)}ms  (drift +${Math.round(correctedEnd - TICKS * PERIOD)}ms)`);

// --- 2. An interval does not wait for async work ----------------------------------

console.log("\nwhen the work outlasts the period (30ms of work, 10ms interval):");

let overlapping = 0;
let maxOverlapping = 0;
let overlapRuns = 0;

await new Promise((resolve) => {
  const id = setInterval(async () => {
    overlapRuns += 1;
    overlapping += 1;
    maxOverlapping = Math.max(maxOverlapping, overlapping);
    await delay(30);
    overlapping -= 1;
    if (overlapRuns === 6) {
      clearInterval(id);
      resolve();
    }
  }, 10);
});
console.log(`  setInterval + async callback: up to ${maxOverlapping} runs in flight at once`);

// The fix is not a shorter interval or a "busy" flag - it is to stop using an
// interval. Chain the next timeout only once the work has finished.
let serialRuns = 0;
let serialMax = 0;
let serialInFlight = 0;
const startSerial = performance.now();
while (serialRuns < 6) {
  serialInFlight += 1;
  serialMax = Math.max(serialMax, serialInFlight);
  await delay(30); // the work
  serialInFlight -= 1;
  serialRuns += 1;
  await delay(10); // the gap AFTER it, not overlapping it
}
console.log(
  `  timeout chained after the work: up to ${serialMax} in flight, 6 runs in ~${Math.round(performance.now() - startSerial)}ms`,
);

// --- 3. Debounce vs throttle, framework-free --------------------------------------

/** Fire once, `wait`ms after the calls STOP. */
export function debounce(fn, wait) {
  let timer = null;
  const debounced = (...args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

/** Fire at most once per `wait`ms: immediately, then trailing with the last args. */
export function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let pending = null;

  const throttled = (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
      return;
    }
    // Inside the window: remember the newest args and fire them at the edge, so
    // the final call of a burst is never dropped.
    pending = args;
    timer ??= setTimeout(() => {
      timer = null;
      last = Date.now();
      const args2 = pending;
      pending = null;
      if (args2) fn(...args2);
    }, remaining);
  };
  throttled.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return throttled;
}

console.log("\n20 events over ~200ms (one every 10ms):");

const raw = [];
const debouncedCalls = [];
const throttledCalls = [];

const onDebounced = debounce((n) => debouncedCalls.push(n), 50);
const onThrottled = throttle((n) => throttledCalls.push(n), 50);

for (let n = 0; n < 20; n += 1) {
  raw.push(n);
  onDebounced(n);
  onThrottled(n);
  await delay(10);
}
await delay(80); // let the trailing edges fire

console.log(`  raw handler:      ${raw.length} calls`);
console.log(`  debounce(50ms):   ${debouncedCalls.length} call  -> ${JSON.stringify(debouncedCalls)} (only the last)`);
console.log(`  throttle(50ms):   ${throttledCalls.length} calls -> ${JSON.stringify(throttledCalls)} (spread out, last kept)`);

// --- 4. Count the clock, not the ticks --------------------------------------------

console.log("\na countdown that survives a stalled thread (200ms, 20ms ticks):");

await new Promise((resolve) => {
  const started = Date.now();
  const total = 200;
  let ticksSeen = 0;
  let naiveRemaining = total;

  const id = setInterval(() => {
    ticksSeen += 1;
    // Naive: subtract the period on every tick and hope every tick happens.
    naiveRemaining -= 20;
    // Derived: ask the clock. Missed ticks cannot make this wrong.
    const derivedRemaining = Math.max(0, total - (Date.now() - started));

    if (ticksSeen === 3) busy(80); // a stall: GC pause, a background tab, a big render

    if (derivedRemaining === 0 || ticksSeen > 20) {
      clearInterval(id);
      console.log(`  ticks that actually fired: ${ticksSeen} of the expected ${total / 20}`);
      console.log(`  counting ticks says ${naiveRemaining}ms left; the clock says ${derivedRemaining}ms`);
      resolve();
    }
  }, 20);
});

// --- 5. Which clock to measure with -----------------------------------------------

console.log("\nDate.now() vs performance.now():");
const dateStart = Date.now();
const perfStart = performance.now();
await delay(50);
console.log(`  Date.now():        ${Date.now() - dateStart}ms       (wall clock - can jump backwards on an NTP sync)`);
console.log(`  performance.now(): ${(performance.now() - perfStart).toFixed(3)}ms  (monotonic, sub-millisecond - use this for durations)`);
