/**
 * The two rate limiter families, side by side.
 *
 * Both answer "may I make this call yet?", and they disagree about what the
 * limit means:
 *
 *   TIME WINDOW  - counts *events* inside a span of time. "No more than N in
 *                  any 60 seconds." The window is the unit; the clock only
 *                  decides when an old event stops counting.
 *   TOKEN BUCKET - counts *credit*. A bucket of `capacity` tokens refills at a
 *                  steady rate and every call spends some; you may proceed when
 *                  you can pay. Rate and burst size are separate numbers.
 *
 * The practical difference is what happens after a quiet period. A window
 * limiter forgets: idling for an hour still buys you exactly N calls in the next
 * window. A bucket saves up: idling fills it, so the next burst may be as large
 * as `capacity` before the steady rate takes over.
 *
 * This file is a module, not a script - it exports and prints nothing, so
 * importing it has no side effects. See rate-limiter-comparison.mjs for both of
 * them in use.
 */

import { setTimeout as delay } from "node:timers/promises";

// `performance.now()` is monotonic; `Date.now()` is not. An NTP correction that
// moves the wall clock backwards would make "time since the last refill"
// negative and freeze a bucket, or age a whole window out at once.
const now = () => performance.now();

// --- Family 1: count events in a window ----------------------------------------------

/**
 * A sliding-window limiter: at most `limit` grants in any `intervalMs` span.
 *
 * It keeps one timestamp per grant still inside the window, which is what makes
 * the guarantee exact - and what makes it O(limit) memory per limiter. That is
 * nothing for one API client and a real number for a per-user limiter with
 * 100,000 users.
 */
export class SlidingWindowLimiter {
  #limit;
  #intervalMs;
  /** Timestamps of the grants still inside the window. */
  #grants = [];

  constructor({ limit, intervalMs }) {
    this.#limit = limit;
    this.#intervalMs = intervalMs;
  }

  /** Resolves once the caller is allowed to proceed. */
  async take() {
    for (;;) {
      const at = now();
      // Drop grants that have aged out of the window.
      while (this.#grants.length > 0 && at - this.#grants[0] >= this.#intervalMs) {
        this.#grants.shift();
      }
      if (this.#grants.length < this.#limit) {
        this.#grants.push(at);
        return;
      }
      // Sleep exactly until the oldest grant expires, then re-check: several
      // callers can wake together, and the loop is what keeps that safe.
      await delay(this.#intervalMs - (at - this.#grants[0]));
    }
  }

  /** Convenience wrapper: `await limiter.run(() => fetch(url))`. */
  async run(task) {
    await this.take();
    return task();
  }
}

/**
 * The naive version, kept as an anti-pattern: a counter reset every interval.
 *
 * It is cheap - one number instead of an array - and it is wrong at the seam.
 * Spend the whole allowance just before the reset and the whole allowance again
 * just after, and 2x the limit lands inside one interval-long span. This is the
 * bug that makes "100 requests per minute" deliver 200 in a second.
 */
export class FixedWindowCounter {
  #limit;
  #intervalMs;
  #used = 0;
  #windowStart = now();

  constructor({ limit, intervalMs }) {
    this.#limit = limit;
    this.#intervalMs = intervalMs;
  }

  tryTake() {
    const at = now();
    if (at - this.#windowStart >= this.#intervalMs) {
      this.#windowStart = at;
      this.#used = 0;
    }
    if (this.#used >= this.#limit) return false;
    this.#used += 1;
    return true;
  }
}

// --- Family 2: spend credit that refills ---------------------------------------------

/**
 * A token bucket: `capacity` tokens, refilled at `refill` tokens per
 * `intervalMs`, spent by callers.
 *
 * Two things to notice about the implementation. First, there is no timer: the
 * bucket is refilled lazily, by deriving the level from the clock the moment
 * anyone looks at it. An interval that adds tokens 100 times a second would burn
 * CPU on every idle limiter in the process, drift, and stop refilling in a
 * throttled background tab - deriving from the clock has none of those problems
 * and is the same rule as any other correct timer code.
 *
 * Second, `tokens` is a float. Fractional tokens are what let the refill be
 * continuous instead of stepping once per interval, which is the difference
 * between a smooth trickle and a stutter.
 */
export class TokenBucket {
  #capacity;
  #tokensPerMs;
  #tokens;
  #updatedAt = now();

  /**
   * @param capacity   Maximum credit that can be saved up = the largest burst.
   * @param refill     Tokens added per `intervalMs` = the sustained rate.
   * @param intervalMs The unit the rate is quoted in.
   * @param startFull  `false` makes a cold client wait for its first token
   *                   instead of opening with a full-size burst.
   */
  constructor({ capacity, refill = capacity, intervalMs = 1000, startFull = true }) {
    if (!(capacity > 0) || !(refill > 0) || !(intervalMs > 0)) {
      throw new RangeError("capacity, refill and intervalMs must all be positive");
    }
    this.#capacity = capacity;
    this.#tokensPerMs = refill / intervalMs;
    this.#tokens = startFull ? capacity : 0;
  }

  #refill() {
    const at = now();
    this.#tokens = Math.min(this.#capacity, this.#tokens + (at - this.#updatedAt) * this.#tokensPerMs);
    this.#updatedAt = at;
  }

  /** Credit available right now. Reading it is what refills the bucket. */
  get tokens() {
    this.#refill();
    return this.#tokens;
  }

  /**
   * Non-blocking: spend `cost` tokens if they are there, otherwise report that
   * they are not. This is the shape a server wants - a request that cannot pay
   * is answered `429` immediately rather than parked for a minute.
   */
  tryTake(cost = 1) {
    if (cost > this.#capacity) {
      throw new RangeError(`cost ${cost} can never be paid by a bucket of capacity ${this.#capacity}`);
    }
    this.#refill();
    if (this.#tokens < cost) return false;
    this.#tokens -= cost;
    return true;
  }

  /**
   * Blocking: wait until `cost` tokens exist, then spend them.
   *
   * The wait is computed, not polled - the deficit divided by the fill rate is
   * exactly how long the tokens take to arrive. The loop is still required
   * because several waiters wake to the same tokens and only some can pay.
   */
  async take(cost = 1) {
    for (;;) {
      if (this.tryTake(cost)) return;
      const deficit = cost - this.#tokens;
      await delay(Math.ceil(deficit / this.#tokensPerMs));
    }
  }

  /** Convenience wrapper: `await bucket.run(() => fetch(url), 5)`. */
  async run(task, cost = 1) {
    await this.take(cost);
    return task();
  }
}
