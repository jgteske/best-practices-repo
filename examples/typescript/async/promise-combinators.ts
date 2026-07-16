/**
 * Choosing the right Promise combinator - and reading its result type.
 *
 * `all`, `allSettled`, `race`, and `any` each have a distinct result type
 * that tells you exactly what you can rely on. Picking the wrong one is a
 * common source of "why is this undefined" bugs.
 */

interface Service {
  name: string;
  ping(): Promise<number>;
}

const services: readonly Service[] = [
  { name: "db", ping: async () => 12 },
  { name: "cache", ping: async () => 3 },
];

// Promise.all — fail fast. Result: number[]. Rejects as soon as ANY rejects,
// so if it resolves you know every value is present.
async function pingAllOrFail(): Promise<number[]> {
  return Promise.all(services.map((s) => s.ping()));
}

// Promise.allSettled — never rejects. Result is a tagged union per input,
// so you must narrow on `.status` before touching `.value`/`.reason`. Use
// this when partial success is acceptable and you want every outcome.
async function pingReport(): Promise<string[]> {
  const settled = await Promise.allSettled(services.map((s) => s.ping()));
  return settled.map((result, i) => {
    const name = services[i]?.name ?? "unknown";
    // `result` is PromiseSettledResult<number>: fulfilled | rejected.
    return result.status === "fulfilled"
      ? `${name}: ${result.value}ms`
      : `${name}: failed (${String(result.reason)})`;
  });
}

// Promise.race — first to settle wins (resolve OR reject). Common for
// timeouts: race the real work against a rejection timer.
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
  );
  return Promise.race([work, timeout]);
}

export { pingAllOrFail, pingReport, withTimeout };
