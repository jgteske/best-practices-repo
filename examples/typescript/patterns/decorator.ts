/**
 * Decorator: a function that returns the same shape it was given.
 *
 * The GoF form wraps an object in another object implementing the same
 * interface. TypeScript's structural typing makes that nearly free - and for
 * the common case (wrapping a single function) the decorator is just a
 * higher-order function whose generics preserve the signature exactly.
 *
 * Note this has nothing to do with `@decorator` syntax, which is a different
 * feature solving a different problem.
 */

type AsyncFn<A extends readonly unknown[], R> = (...args: A) => Promise<R>;

/**
 * Because `A` and `R` flow straight through, the wrapped function keeps its
 * exact parameter names, arity and return type. No `Parameters<…>` or
 * `ReturnType<…>` gymnastics, and no `any` leaking into the call site.
 */
function withRetry<A extends readonly unknown[], R>(
  fn: AsyncFn<A, R>,
  attempts = 3,
): AsyncFn<A, R> {
  return async (...args) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };
}

function withTiming<A extends readonly unknown[], R>(
  fn: AsyncFn<A, R>,
  onDone: (ms: number) => void,
): AsyncFn<A, R> {
  return async (...args) => {
    const started = Date.now();
    try {
      return await fn(...args);
    } finally {
      onDone(Date.now() - started);
    }
  };
}

type User = { readonly id: string; readonly email: string };

// A dependency that fails the first two times it is called.
let attemptsSoFar = 0;
async function fetchUser(id: string): Promise<User> {
  attemptsSoFar += 1;
  if (attemptsSoFar < 3) throw new Error("flaky network");
  return { id, email: `${id}@example.com` };
}

// Decorators compose by nesting. The outermost wrapper runs first, so this
// times the *whole* retrying sequence rather than each individual attempt -
// swapping the two lines changes the meaning, which is worth being deliberate
// about.
const timings: number[] = [];
const loadUser = withTiming(withRetry(fetchUser), (ms) => timings.push(ms));

void loadUser("u1").then((user) => {
  console.log(user.email); // u1@example.com
  console.log(attemptsSoFar, timings.length); // 3 1
});

/**
 * The object form, for wrapping a whole port.
 *
 * The decorator takes the port and returns the port, so callers cannot tell
 * the difference - no interface to implement, no base class to extend. The
 * spread copies any members this decorator does not care about, so adding a
 * method to `UserRepository` does not require touching the cache.
 */
type UserRepository = {
  findById: (id: string) => Promise<User | undefined>;
  save: (user: User) => Promise<void>;
};

function withCache(inner: UserRepository): UserRepository {
  const cache = new Map<string, User | undefined>();

  return {
    ...inner,
    findById: async (id) => {
      // `has` rather than a truthiness check: "cached as not found" is a real
      // answer, and one worth not re-querying.
      if (cache.has(id)) return cache.get(id);

      const user = await inner.findById(id);
      cache.set(id, user);
      return user;
    },
    save: async (user) => {
      cache.delete(user.id); // invalidate, don't guess
      await inner.save(user);
    },
  };
}

let reads = 0;
const baseRepository: UserRepository = {
  findById: async (id) => {
    reads += 1;
    return { id, email: `${id}@example.com` };
  },
  save: async () => {},
};

const repository = withCache(baseRepository);
void (async () => {
  await repository.findById("u1");
  await repository.findById("u1");
  console.log(reads); // 1 - the second read was served from the cache
})();

export { withRetry, withTiming, withCache };
export type { AsyncFn, User, UserRepository };
