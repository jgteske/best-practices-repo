/**
 * A repository behind a port, and the composition root that wires it up.
 *
 * The port is a type, not a base class. Every implementation - the real one and
 * the in-memory double the tests use - is a factory returning that type, so the
 * double cannot drift: the moment the port grows a method, the fake stops
 * compiling.
 */

type User = { readonly id: string; readonly email: string };

// The port. Callers depend on this, never on a concrete implementation.
type UserRepository = {
  findById: (id: string) => Promise<User | undefined>;
  save: (user: User) => Promise<void>;
};

// The double used by tests and local development. It is a real implementation
// of the port, not a mock, so tests exercise the same code paths.
function createInMemoryUserRepository(
  seed: readonly User[] = [],
): UserRepository {
  const byId = new Map<string, User>(seed.map((user) => [user.id, user]));

  return {
    findById: async (id) => byId.get(id),
    save: async (user) => {
      byId.set(user.id, user);
    },
  };
}

// The database itself is injected as a single function, which keeps this file
// free of any driver import - and keeps the driver out of the tests.
type Query = <Row>(sql: string, params: readonly unknown[]) => Promise<Row[]>;

function createSqlUserRepository(query: Query): UserRepository {
  return {
    findById: async (id) => {
      const rows = await query<User>("select id, email from users where id = $1", [id]);
      // `noUncheckedIndexedAccess` types this as `User | undefined`, which is
      // exactly what the port promises - the empty-result case cannot be
      // forgotten.
      return rows[0];
    },
    save: async (user) => {
      await query(
        "insert into users (id, email) values ($1, $2) on conflict (id) do update set email = $2",
        [user.id, user.email],
      );
    },
  };
}

type ChangeEmailResult =
  | { readonly ok: true; readonly user: User }
  | { readonly ok: false; readonly reason: "notFound" | "invalidEmail" };

// The service depends on the port, so it has no idea which implementation it
// received - and needs no change when that answer differs between production
// and a test.
function createUserService(users: UserRepository) {
  return {
    changeEmail: async (id: string, email: string): Promise<ChangeEmailResult> => {
      if (!email.includes("@")) return { ok: false, reason: "invalidEmail" };

      const existing = await users.findById(id);
      if (existing === undefined) return { ok: false, reason: "notFound" };

      const updated: User = { ...existing, email };
      await users.save(updated);
      return { ok: true, user: updated };
    },
  };
}

/**
 * The composition root: the one place that knows how the graph fits together.
 *
 * `ReturnType<typeof …>` means the container's type is derived from the
 * factories rather than hand-maintained alongside them. `Partial<Container>`
 * lets a test replace exactly the pieces it cares about and inherit the rest.
 */
type Container = {
  readonly users: UserRepository;
  readonly userService: ReturnType<typeof createUserService>;
};

function createContainer(overrides: Partial<Container> = {}): Container {
  const users = overrides.users ?? createInMemoryUserRepository();
  const userService = overrides.userService ?? createUserService(users);
  return { users, userService };
}

const container = createContainer({
  users: createInMemoryUserRepository([{ id: "u1", email: "ada@example.com" }]),
});

void container.userService
  .changeEmail("u1", "ada@lovelace.dev")
  .then(console.log); // { ok: true, user: { id: 'u1', email: 'ada@lovelace.dev' } }

void container.userService.changeEmail("nobody", "x@y.dev").then(console.log);
// { ok: false, reason: 'notFound' }

export {
  createInMemoryUserRepository,
  createSqlUserRepository,
  createUserService,
  createContainer,
};
export type { User, UserRepository, Query, Container, ChangeEmailResult };
