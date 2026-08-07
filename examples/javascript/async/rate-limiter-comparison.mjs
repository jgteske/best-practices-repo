/**
 * The same traffic through both rate limiters, so the difference is measured
 * rather than asserted.
 *
 * Every scenario below is configured so the two limiters have the SAME
 * sustained rate - 3 calls per 100ms. Everything that differs in the output is
 * therefore a property of the algorithm, not of the numbers.
 *
 * Run: node examples/javascript/async/rate-limiter-comparison.mjs
 */

import { setTimeout as delay } from "node:timers/promises";
import { SlidingWindowLimiter, TokenBucket, FixedWindowCounter } from "./rate-limiter.mjs";

/** Milliseconds, rounded to 10ms so the output is readable. */
const round10 = (elapsed) => Math.round(elapsed / 10) * 10;

/**
 * Run `count` calls through `limiter` all at once, returning each grant's time
 * relative to the moment they all arrived.
 */
const grantTimes = async (limiter, count) => {
  const arrivedAt = performance.now();
  const times = new Array(count);
  await Promise.all(
    Array.from({ length: count }, (_, i) => limiter.run(() => (times[i] = round10(performance.now() - arrivedAt)))),
  );
  return times;
};

const ms = (times) => times.map((t) => `${t}ms`).join(" ");

// --- 1. Same rate, different release pattern -----------------------------------------

console.log("9 calls arriving at once, both limiters set to 3 per 100ms:");

const window1 = await grantTimes(new SlidingWindowLimiter({ limit: 3, intervalMs: 100 }), 9);
const bucket1 = await grantTimes(new TokenBucket({ capacity: 3, refill: 3, intervalMs: 100 }), 9);

console.log(`   time window: ${ms([...window1].sort((a, b) => a - b))}`);
console.log(`   token bucket: ${ms([...bucket1].sort((a, b) => a - b))}`);
console.log("   the window releases in batches of 3; the bucket trickles one per ~33ms");

// Neither limiter is a queue. Six waiters wake together when the oldest grant
// expires, three of them win, and the losers sleep again - so which call gets
// the slot is decided by the runtime's wake order, not by arrival order.
const inArrivalOrder = window1.every((time, i) => i === 0 || time >= window1[i - 1]);
console.log(
  `   by call number: ${ms(window1)}  <- ${
    inArrivalOrder ? "in arrival order this run - but nothing promises that" : "arrival order lost: not FIFO"
  }`,
);

// --- 2. What an idle period buys you -------------------------------------------------

console.log("\nafter idling for 300ms, how many of 10 calls go straight through:");

/** How many of `count` simultaneous calls are granted in the first 10ms. */
const immediate = async (limiter, count) => (await grantTimes(limiter, count)).filter((t) => t <= 10).length;

const window2 = new SlidingWindowLimiter({ limit: 3, intervalMs: 100 });
await delay(300);
const windowBurst = await immediate(window2, 10);

// `startFull: false` so the only credit this bucket has is what the idle bought:
// 300ms at 3 per 100ms is 9 tokens, one short of its capacity.
const bucket2 = new TokenBucket({ capacity: 10, refill: 3, intervalMs: 100, startFull: false });
await delay(300);
const bucketBurst = await immediate(bucket2, 10);

console.log(`   time window (3 per 100ms):          ${windowBurst} of 10`);
console.log(`   token bucket (cap 10, 3 per 100ms): ${bucketBurst} of 10`);
console.log("   the window forgets idle time; the bucket saved it up as burst credit");

// --- 3. Not every call costs the same ------------------------------------------------

console.log("\ncalls that cost different amounts (bucket of 10, 10 per 100ms):");

const priced = new TokenBucket({ capacity: 10, refill: 10, intervalMs: 100 });
console.log(`   start:                 ${priced.tokens.toFixed(1)} tokens`);
console.log(`   cheap GET (cost 1):    ${priced.tryTake(1)} -> ${priced.tokens.toFixed(1)} left`);
console.log(`   expensive search (5):  ${priced.tryTake(5)} -> ${priced.tokens.toFixed(1)} left`);
console.log(`   another search (5):    ${priced.tryTake(5)} <- refused, only 4 tokens in the bucket`);
console.log("   a window limiter counts calls, so it cannot express 'this one costs five'");

// --- 4. capacity 1 is a pacer --------------------------------------------------------

console.log("\ncapacity 1 = no burst at all, just even spacing (1 per 20ms):");

const pacer = await grantTimes(new TokenBucket({ capacity: 1, refill: 1, intervalMs: 20 }), 6);
console.log(`   ${ms([...pacer].sort((a, b) => a - b))}`);
console.log("   this is the 'leaky bucket' shape: smooth output, zero tolerance for bursts");

// --- 5. What each one actually guarantees --------------------------------------------

/** The most grants that land inside any `spanMs`-long span. */
const busiestSpan = (times, spanMs) =>
  Math.max(...times.map((start) => times.filter((t) => t >= start && t < start + spanMs).length));

console.log("\nsaturated for ~300ms, busiest 100ms span (both rated 5 per 100ms):");

const window5 = await grantTimes(new SlidingWindowLimiter({ limit: 5, intervalMs: 100 }), 20);
const bucket5 = await grantTimes(new TokenBucket({ capacity: 5, refill: 5, intervalMs: 100 }), 20);

console.log(`   time window: ${busiestSpan(window5, 100)} calls  <- the limit, exactly, in every span`);
console.log(`   token bucket: ${busiestSpan(bucket5, 100)} calls  <- up to capacity + rate x span`);
console.log("   if the API's contract is literally 'N per rolling window', size the");
console.log("   bucket's capacity below N - the two limits are not interchangeable");

// --- The one to not write: a counter reset per interval -------------------------------

console.log("\nwhy not a fixed-window counter (5 per 100ms, spend it either side of a reset):");

const naive = new FixedWindowCounter({ limit: 5, intervalMs: 100 });
const naiveGrants = [];
const naiveStart = performance.now();
// Sit out most of the window, then spend the whole allowance right before the
// reset and the whole allowance again right after it.
await delay(80);
while (naive.tryTake()) naiveGrants.push(round10(performance.now() - naiveStart));
await delay(40);
while (naive.tryTake()) naiveGrants.push(round10(performance.now() - naiveStart));

console.log(`   grants at: ${ms(naiveGrants)}`);
console.log(`   busiest 100ms span: ${busiestSpan(naiveGrants, 100)} calls - 2x the limit at the seam`);
