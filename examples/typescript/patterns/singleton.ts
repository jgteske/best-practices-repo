/**
 * Singleton: a module, and the reason to be suspicious of one.
 *
 * ES modules are evaluated once per program, so a module-scoped value already
 * *is* a singleton - the `getInstance()` dance exists in other languages
 * because they have no module system, not because the pattern needs it.
 *
 * The interesting question is therefore not "how", it is "should this be
 * global at all?" - because a singleton is a dependency nothing declares.
 */

type Config = {
  readonly apiUrl: string;
  readonly timeoutMs: number;
};

// Frozen so a stray write is an error in strict mode rather than a mutation
// that some unrelated module later observes.
const config: Config = Object.freeze({
  apiUrl: "https://api.example.com",
  timeoutMs: 5_000,
});

console.log(config.timeoutMs); // 5000

/**
 * Lazy initialisation, when construction is expensive or must not happen at
 * import time. `??=` assigns only when the slot is still undefined, which is
 * the whole of `getInstance()`.
 */
type Pool = {
  readonly id: number;
  query: (sql: string) => Promise<readonly unknown[]>;
};

let poolsCreated = 0;

function createPool(): Pool {
  poolsCreated += 1;
  const id = poolsCreated;
  return { id, query: async () => [] };
}

let pool: Pool | undefined;
const getPool = (): Pool => (pool ??= createPool());

console.log(getPool().id === getPool().id); // true
console.log(poolsCreated); // 1

/**
 * The async version caches the **promise**, not the resolved value.
 *
 * Caching the value leaves a window between "started connecting" and "finished
 * connecting" in which a second caller sees an empty slot and starts a second
 * connection. Storing the promise closes it: everyone awaits the same work.
 */
let connecting: Promise<Pool> | undefined;

const connect = async (): Promise<Pool> => createPool();
const getConnection = (): Promise<Pool> => (connecting ??= connect());

void Promise.all([getConnection(), getConnection()]).then(([first, second]) => {
  console.log(first === second); // true - one connection, not two
});

/**
 * The cost, and the way out.
 *
 * A module-level instance is a dependency that no signature mentions: it cannot
 * be substituted in a test, it cannot differ per request or per tenant, and two
 * tests that both touch it are no longer independent. The usual patch is a
 * `resetForTests()` export - which is a reliable sign the value should have
 * been a parameter.
 *
 * Keep the lazy getter if you like, but let callers receive what they use. The
 * composition root then decides how many exist, and a test passes its own.
 */
type UserService = { load: (id: string) => Promise<string> };

function createUserService(deps: { readonly pool: Pool }): UserService {
  return {
    load: async (id) => {
      await deps.pool.query(`select * from users where id = '${id}'`);
      return `user:${id} via pool ${deps.pool.id}`;
    },
  };
}

// Production passes the shared instance; a test passes its own stub, with no
// module mocking and no global reset between cases.
const service = createUserService({ pool: getPool() });
void service.load("u1").then(console.log); // user:u1 via pool 1

const testService = createUserService({
  pool: { id: 99, query: async () => [] },
});
void testService.load("u1").then(console.log); // user:u1 via pool 99

export { config, getPool, getConnection, createUserService };
export type { Config, Pool, UserService };
