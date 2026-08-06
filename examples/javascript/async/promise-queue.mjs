/**
 * A concurrency-limited promise queue: the ~40 lines it takes.
 *
 * `Promise.all(items.map(work))` starts EVERY item at once. That is fine for
 * three items and a catastrophe for three thousand: sockets exhausted, the API's
 * rate limit tripped, every response held in memory at the same time. A queue
 * puts a ceiling on how many tasks are in flight without changing the result.
 *
 * This file is a module, not a script - it exports and prints nothing, so
 * importing it has no side effects. See promise-queue-usage.mjs for it in use.
 */

export class PromiseQueue {
  #limit;
  #running = 0;
  #queue = [];
  #idleResolvers = [];

  constructor({ concurrency = 4 } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new RangeError("concurrency must be a positive integer");
    }
    this.#limit = concurrency;
  }

  /** Tasks currently executing. */
  get running() {
    return this.#running;
  }

  /** Tasks accepted but not started yet. */
  get pending() {
    return this.#queue.length;
  }

  /**
   * Queue a task and get back a promise for its result. Note what `add` takes:
   * a FUNCTION returning a promise, not a promise. A promise is already running
   * by the time you hold it - only a function can be started later.
   */
  add(task, { signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      this.#queue.push({ task, resolve, reject, signal });
      this.#pump();
    });
  }

  /** Resolves when everything queued has settled. Never rejects. */
  onIdle() {
    if (this.#running === 0 && this.#queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.#idleResolvers.push(resolve));
  }

  #pump() {
    while (this.#running < this.#limit && this.#queue.length > 0) {
      const job = this.#queue.shift();

      // An abort that lands while the job is still WAITING drops it: the task
      // function is never called at all. A task already running has to observe
      // the signal itself - the queue cannot claw it back.
      if (job.signal?.aborted) {
        job.reject(job.signal.reason);
        continue;
      }

      this.#running += 1;
      // Promise.resolve().then(task) puts a synchronous `throw` inside the task
      // on the same path as a rejected promise, so both reach `job.reject`.
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          this.#running -= 1;
          this.#pump();
        });
    }

    if (this.#running === 0 && this.#queue.length === 0) {
      for (const resolve of this.#idleResolvers.splice(0)) resolve();
    }
  }
}

/**
 * The everyday wrapper: a drop-in `Promise.all(items.map(...))` with a ceiling.
 * Results stay in INPUT order because that is what Promise.all over the array of
 * per-task promises gives you - completion order never leaks into the output.
 */
export function mapConcurrent(items, worker, { concurrency = 4, signal } = {}) {
  const queue = new PromiseQueue({ concurrency });
  return Promise.all(items.map((item, index) => queue.add(() => worker(item, index), { signal })));
}

/** The `allSettled` twin: one failure never discards the successes. */
export function mapSettled(items, worker, { concurrency = 4, signal } = {}) {
  const queue = new PromiseQueue({ concurrency });
  return Promise.allSettled(items.map((item, index) => queue.add(() => worker(item, index), { signal })));
}
