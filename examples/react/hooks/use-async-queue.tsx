import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEventCallback } from "./stable-callback";

// Dropping 200 files onto an upload zone and calling
// `Promise.all(files.map(upload))` starts 200 uploads at once: the browser caps
// them at ~6 per host anyway, the server sees a burst it did not ask for, and
// the user gets a progress bar that sits at 0% and then jumps to 100%.
//
// The fix is the same as in plain JavaScript - a queue with a ceiling - plus the
// one thing React adds: the queue's progress has to be *rendered*, so the
// machine is kept in refs and mirrored into state.

export type JobState =
  | { status: "queued" }
  | { status: "running" }
  | { status: "done" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type Job<T> = {
  readonly id: string;
  readonly input: T;
  readonly state: JobState;
};

/**
 * Layer 2: run at most `concurrency` async jobs at a time, with a rendered
 * status per job and cancellation that reaches both the running jobs and the
 * ones still waiting.
 */
export function useAsyncQueue<T>(
  worker: (input: T, signal: AbortSignal) => Promise<void>,
  { concurrency = 3 }: { concurrency?: number } = {},
) {
  // The worker is read through a stable wrapper, so a caller passing an inline
  // arrow never restarts or re-creates the queue.
  const runWorker = useEventCallback(worker);

  const [jobs, setJobs] = useState<ReadonlyArray<Job<T>>>([]);

  // The queue itself is a machine, not derived state: mutating a ref cannot be
  // interrupted by a re-render, and two jobs can never start from one slot
  // because of a stale `jobs` snapshot. React state is the *view* of it.
  const waiting = useRef<Array<{ id: string; input: T }>>([]);
  const running = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());
  const nextId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Whoever starts a request aborts it. Unmounting mid-upload must not
      // leave requests running against a component that no longer exists.
      for (const controller of controllers.current.values()) controller.abort();
      controllers.current.clear();
      waiting.current = [];
    };
  }, []);

  const patch = useCallback((id: string, state: JobState) => {
    // A job that settles after unmount updates nothing - the alternative is a
    // setState on a dead component.
    if (!mounted.current) return;
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, state } : job)));
  }, []);

  // `useEventCallback` gives this a permanently stable identity, which is what
  // lets it call itself from a `.finally()` and still see the newest
  // `concurrency` - no ref juggling, no re-created scheduler.
  const pump = useEventCallback(() => {
    while (running.current < concurrency && waiting.current.length > 0) {
      const job = waiting.current.shift();
      if (job === undefined) break;

      running.current += 1;
      const controller = new AbortController();
      controllers.current.set(job.id, controller);
      patch(job.id, { status: "running" });

      void runWorker(job.input, controller.signal)
        .then(
          () => patch(job.id, { status: "done" }),
          (error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              patch(job.id, { status: "cancelled" });
              return;
            }
            patch(job.id, {
              status: "error",
              message: error instanceof Error ? error.message : "Upload failed",
            });
          },
        )
        .finally(() => {
          running.current -= 1;
          controllers.current.delete(job.id);
          pump();
        });
    }
  });

  const enqueue = useCallback(
    (inputs: readonly T[]) => {
      const added = inputs.map((input) => ({ id: `job-${nextId.current++}`, input }));
      waiting.current.push(...added);
      setJobs((prev) => [...prev, ...added.map((job) => ({ ...job, state: { status: "queued" } as const }))]);
      pump();
    },
    [pump],
  );

  const cancelAll = useCallback(() => {
    // Jobs that never started are dropped without ever calling the worker;
    // running jobs are aborted and report back through their own rejection.
    const dropped = waiting.current.splice(0);
    for (const job of dropped) patch(job.id, { status: "cancelled" });
    for (const controller of controllers.current.values()) controller.abort();
  }, [patch]);

  const stats = useMemo(() => {
    const count = (status: JobState["status"]) => jobs.filter((job) => job.state.status === status).length;
    return {
      total: jobs.length,
      queued: count("queued"),
      running: count("running"),
      done: count("done"),
      failed: count("error"),
      cancelled: count("cancelled"),
    };
  }, [jobs]);

  const isIdle = stats.queued === 0 && stats.running === 0;

  return { jobs, enqueue, cancelAll, stats, isIdle } as const;
}

// Layer 3: the domain policy - what "upload" means, and a retry that re-queues
// only the jobs that failed.
export function useUploadQueue(concurrency = 3) {
  const { jobs, enqueue, ...rest } = useAsyncQueue<File>(async (file, signal) => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body, signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  }, { concurrency });

  // Depend on the two values actually read, not on the whole returned object -
  // that object is a fresh literal every render, so listing it would rebuild
  // this callback on every render for no reason.
  const retryFailed = useCallback(() => {
    const failed = jobs.filter((job) => job.state.status === "error").map((job) => job.input);
    if (failed.length > 0) enqueue(failed);
  }, [jobs, enqueue]);

  return { jobs, enqueue, ...rest, retryFailed } as const;
}

// Layer 4: markup only. No concurrency logic, no AbortControllers, no counters.
export function UploadPanel() {
  const { jobs, enqueue, cancelAll, retryFailed, stats, isIdle } = useUploadQueue(3);

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(event) => enqueue(Array.from(event.target.files ?? []))}
      />

      <p>
        {stats.done} / {stats.total} uploaded
        {stats.running > 0 && ` — ${stats.running} in flight, ${stats.queued} waiting`}
      </p>

      {!isIdle && <button onClick={cancelAll}>Cancel remaining</button>}
      {stats.failed > 0 && <button onClick={retryFailed}>Retry {stats.failed} failed</button>}

      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            {job.input.name} — {job.state.status}
            {job.state.status === "error" && `: ${job.state.message}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
