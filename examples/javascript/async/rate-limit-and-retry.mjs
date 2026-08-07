/**
 * Retries, deadlines and the order the timing policies stack in - everything
 * that sits ON TOP of a concurrency queue and a rate limiter.
 *
 * A concurrency limit bounds how many calls are in flight; it says nothing about
 * how many you make per second. Two in flight against a 5ms endpoint is 400
 * requests/second, which is exactly the number an API's rate limiter cares
 * about. The two limits are different tools and you usually want both.
 *
 * The limiters themselves live in rate-limiter.mjs; this file imports one.
 *
 * Run: node examples/javascript/async/rate-limit-and-retry.mjs
 */

import { setTimeout as delay } from "node:timers/promises";
import { PromiseQueue } from "./promise-queue.mjs";
import { SlidingWindowLimiter } from "./rate-limiter.mjs";

// --- Retry with exponential backoff and full jitter ----------------------------------

/**
 * "Full jitter": a random point in [0, exponential), not the exponential itself.
 * Un-jittered backoff keeps every client that failed together in lockstep - they
 * all sleep 200ms, then all retry at the same instant, and re-create the spike
 * that knocked the service over in the first place.
 */
export const backoffDelay = (attempt, { baseMs = 100, capMs = 2_000, jitter = true } = {}) => {
  const exponential = Math.min(capMs, baseMs * 2 ** attempt);
  return jitter ? Math.random() * exponential : exponential;
};

export async function retry(task, { attempts = 3, baseMs = 100, jitter = true, signal, onRetry } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw signal.reason;

    try {
      return await task(attempt);
    } catch (error) {
      // Two things are never worth retrying: a deliberate abort, and an error
      // the server has already told you is permanent.
      if (signal?.aborted) throw signal.reason;
      if (attempt >= attempts - 1 || error.permanent) throw error;

      const wait = backoffDelay(attempt, { baseMs, jitter });
      onRetry?.(attempt, wait, error);
      try {
        await delay(wait, undefined, signal ? { signal } : undefined);
      } catch {
        // Aborted while backing off. Surfacing `signal.reason` rather than the
        // sleep's own AbortError is what makes the caller's error deterministic:
        // "why did this stop" has one answer regardless of where it stopped.
        throw signal.reason;
      }
    }
  }
}

console.log("retry with backoff:");

let calls = 0;
const flakyEndpoint = async () => {
  calls += 1;
  if (calls < 3) throw new Error(`503 (attempt ${calls})`);
  return "ok";
};

const retried = await retry(flakyEndpoint, {
  attempts: 5,
  baseMs: 20,
  onRetry: (attempt, wait, error) =>
    console.log(`   attempt ${attempt} failed with "${error.message}", sleeping ~${Math.round(wait)}ms`),
});
console.log(`   succeeded after ${calls} calls:`, retried);

const permanent = Object.assign(new Error("400 bad request"), { permanent: true });
let permanentCalls = 0;
try {
  await retry(
    async () => {
      permanentCalls += 1;
      throw permanent;
    },
    { attempts: 5, baseMs: 20 },
  );
} catch (error) {
  console.log(`   "${error.message}" was retried ${permanentCalls} time(s) - a 4xx is not a blip`);
}

console.log("\nwhy jitter (5 clients that failed at the same instant, attempt 1):");
const withoutJitter = Array.from({ length: 5 }, () => Math.round(backoffDelay(1, { baseMs: 100, jitter: false })));
const withJitter = Array.from({ length: 5 }, () => Math.round(backoffDelay(1, { baseMs: 100 })));
console.log("   no jitter:  ", withoutJitter.join("ms, ") + "ms  <- one synchronised spike");
console.log("   full jitter:", withJitter.join("ms, ") + "ms  <- spread across the window");

// --- Deadlines: per-attempt timeout vs overall budget --------------------------------

/**
 * `AbortSignal.timeout` caps ONE attempt. An overall deadline is a second
 * signal, and `AbortSignal.any` is what lets a call answer to both - whichever
 * fires first wins, and the reason tells you which one it was.
 */
export const withTimeout = (task, { attemptMs, deadline }) => {
  const signals = [AbortSignal.timeout(attemptMs)];
  if (deadline) signals.push(deadline);
  return task(AbortSignal.any(signals));
};

console.log("\nper-attempt timeout vs overall deadline:");

const slowCall = (signal) => delay(200, "never gets here", { signal });

try {
  await withTimeout(slowCall, { attemptMs: 30 });
} catch (error) {
  console.log("   one attempt, 30ms cap ->", error.name);
}

const deadline = AbortSignal.timeout(100);
let attemptsMade = 0;
const deadlineStart = Date.now();
try {
  await retry(
    () => {
      attemptsMade += 1;
      return withTimeout(slowCall, { attemptMs: 30, deadline });
    },
    // jitter off here only so the demo prints the same numbers every run.
    { attempts: 10, baseMs: 10, jitter: false, signal: deadline },
  );
} catch (error) {
  console.log(
    `   10 attempts allowed, but the 100ms budget stopped it after ${attemptsMade} (~${Date.now() - deadlineStart}ms):`,
    error.name,
  );
}

// --- All three policies, stacked in the order that makes sense -----------------------

console.log("\nstacked: queue -> limiter -> retry -> deadline");

const queue = new PromiseQueue({ concurrency: 2 });
const apiLimiter = new SlidingWindowLimiter({ limit: 4, intervalMs: 100 });
let serverCalls = 0;

const fetchWithPolicy = (id) =>
  queue.add(() =>
    retry(
      (attempt) =>
        apiLimiter.run(async () => {
          serverCalls += 1;
          await delay(10);
          // Every second request fails its first attempt.
          if (id % 2 === 1 && attempt === 0) throw new Error(`503 for ${id}`);
          return `resource-${id}`;
        }),
      { attempts: 3, baseMs: 20 },
    ),
  );

const stackedStart = Date.now();
const stacked = await Promise.all([0, 1, 2, 3, 4, 5].map(fetchWithPolicy));
console.log(`   ${stacked.length} resources fetched in ~${Date.now() - stackedStart}ms`);
console.log(`   ${serverCalls} requests actually hit the server (6 + 3 retries)`);
console.log("   order: queue bounds sockets, limiter bounds request rate, retry handles blips");
