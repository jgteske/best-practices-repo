/**
 * Builder: usually an options object, occasionally a fluent chain.
 *
 * Most builders exist to work around languages without named or optional
 * arguments. TypeScript has an options object, so start there - it is smaller,
 * it needs no terminal `build()`, and the compiler already reports a missing
 * required field.
 *
 * The fluent form earns its keep in one situation: when the *order* of calls
 * matters, or when "which fields have been set" needs to be tracked so that
 * `build()` is unavailable until the object is complete.
 */

type Query = {
  readonly table: string;
  readonly columns: readonly string[];
  readonly where: string | null;
  readonly limit: number | null;
};

/** The plain answer: one object, optional members, no chain. */
type QueryOptions = {
  readonly table: string;
  readonly columns?: readonly string[];
  readonly where?: string;
};

function toSql(options: QueryOptions): string {
  const columns = options.columns ?? ["*"];
  const where = options.where === undefined ? "" : ` where ${options.where}`;
  return `select ${columns.join(", ")} from ${options.table}${where}`;
}

console.log(toSql({ table: "users", where: "active" }));
// select * from users where active

/**
 * The fluent version, with the required fields tracked in the type.
 *
 * `Have` accumulates the names of the steps that have been called. `build`
 * only exists once `Have` covers every required step, so calling it too early
 * is a compile error rather than a runtime one - the payoff that justifies the
 * extra machinery.
 */
type Step = "from" | "select";

type QueryBuilder<Have extends Step> = {
  from: (table: string) => QueryBuilder<Have | "from">;
  select: (...columns: string[]) => QueryBuilder<Have | "select">;
  where: (clause: string) => QueryBuilder<Have>;
  limit: (rows: number) => QueryBuilder<Have>;
} & (Step extends Have ? { build: () => Query } : Record<never, never>);

const emptyQuery: Query = { table: "", columns: [], where: null, limit: null };

function createQueryBuilder<Have extends Step = never>(
  state: Query = emptyQuery,
): QueryBuilder<Have> {
  const builder = {
    from: (table: string) =>
      createQueryBuilder<Have | "from">({ ...state, table }),
    select: (...columns: string[]) =>
      createQueryBuilder<Have | "select">({ ...state, columns }),
    where: (clause: string) =>
      createQueryBuilder<Have>({ ...state, where: clause }),
    limit: (rows: number) => createQueryBuilder<Have>({ ...state, limit: rows }),
    build: (): Query => state,
  };

  // The one assertion in the pattern, and it stays inside the factory: `build`
  // always exists at runtime, but its *visibility* is decided by a conditional
  // type the compiler cannot verify against this literal. Every call site
  // outside remains fully checked.
  return builder as QueryBuilder<Have>;
}

// Each step widens `Have`; after `from` and `select`, `build` appears.
const query = createQueryBuilder()
  .from("users")
  .select("id", "email")
  .where("active")
  .limit(10)
  .build();

console.log(query);
// { table: 'users', columns: [ 'id', 'email' ], where: 'active', limit: 10 }

// Order does not matter, only completeness - `select` first works too.
const reordered = createQueryBuilder().select("id").from("users").build();
console.log(reordered.columns); // [ 'id' ]

export { toSql, createQueryBuilder };
export type { Query, QueryOptions, QueryBuilder, Step };
