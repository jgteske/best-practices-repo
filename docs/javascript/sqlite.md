# SQL with node:sqlite

Node has shipped a built-in SQLite driver, `node:sqlite`, since 22.5. It is
unflagged since **22.13** and 23.4, so you can use a real SQL database with no
native addon to compile and no dependency to install. Its API is
**synchronous**, like `better-sqlite3`. That sounds wrong for Node, but SQLite
queries are in-process function calls that usually take microseconds, and a
synchronous API makes transactions far easier to get right.

Examples: [`examples/javascript/sqlite`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript/sqlite).
The Python version of this page, [SQL with sqlite3](../python/sqlite), covers
the SQL side (transactions, migrations, indexes and query plans) in more depth.

::: warning Still experimental
`node:sqlite` prints `ExperimentalWarning: SQLite is an experimental feature`
on first use, and details of its API are still changing. For production
services today, `better-sqlite3` is the mature choice with an almost identical
API. `node --no-warnings` silences the warning.
:::

## Connecting and creating tables

<<< ../../examples/javascript/sqlite/basics.mjs#connect{js}

`exec()` runs one or more statements and returns nothing. Use it for schema
changes and PRAGMAs. As in every SQLite driver, `PRAGMA foreign_keys = ON` is
off by default and applies only to the connection that sets it. `STRICT` makes
column types enforced.

## Prepared statements and placeholders

<<< ../../examples/javascript/sqlite/basics.mjs#prepared{js}

`prepare()` compiles the SQL once and returns a `StatementSync` you can run
many times with different values. `run()` returns `{ changes, lastInsertRowid }`.
Prepare statements once, at module level or in a constructor, and not inside a
hot loop.

### Why: SQL injection

<<< ../../examples/javascript/sqlite/basics.mjs#injection{js}

A template literal splices the input into the SQL text, so
`' OR '1'='1` returns every row. A bound parameter can never become SQL.
Placeholders cover values only. Table and column names must come from an
allow-list in your code.

## Reading rows

<<< ../../examples/javascript/sqlite/basics.mjs#rows{js}

```
Ada: Engines
Ada: Notes
Grace: Compilers
```

| Method | Returns |
| --- | --- |
| `get(...params)` | the first row as an object, or `undefined` |
| `all(...params)` | an array of row objects |
| `iterate(...params)` | a lazy iterator, for large results |
| `run(...params)` | `{ changes, lastInsertRowid }` |

Rows are null-prototype objects, so compare them with `{ ...row }`.
`INTEGER` values outside the safe-integer range need
`statement.setReadBigInts(true)`.

### Constraints

<<< ../../examples/javascript/sqlite/basics.mjs#strict{js}

A constraint violation throws an `Error` whose message names the constraint.
Let the schema enforce your invariants, because it applies to every writer.

## Transactions: write the helper once

<<< ../../examples/javascript/sqlite/transactions-and-migrations.mjs#transaction-helper{js}

`node:sqlite` has no `transaction()` method, so this helper is the one piece of
infrastructure every project writes. `BEGIN IMMEDIATE` takes the write lock up
front. A plain `BEGIN` takes it at the first write, and with several processes
that can fail with `SQLITE_BUSY` halfway through.

The synchronous API is what keeps this helper safe. Because `fn` can't
`await`, no other code can run on this connection between `BEGIN` and
`COMMIT`. With an async driver, a second request could slip its own queries
into your open transaction. Async drivers handle this with a dedicated
connection per transaction from a pool.

<<< ../../examples/javascript/sqlite/transactions-and-migrations.mjs#transfer{js}

When the debit violates `CHECK (balance >= 0)`, the helper rolls back the
credit that already ran, so the balances never show a half-applied transfer.

## Migrations

<<< ../../examples/javascript/sqlite/transactions-and-migrations.mjs#migrations{js}

```
applied migration 1
applied migration 2
applied migration 3
```

This is the same pattern as the Python page: an append-only list, and
`PRAGMA user_version` to record progress. Each step and its version bump go in
one transaction. ORMs and query builders (Drizzle, Kysely, Prisma) generate and
track migrations for you, but the model underneath is this one.

## Rules of thumb

- Bind every value with `?`/`$name`. Never build SQL with template literals.
- `prepare()` once, run many times.
- Enable `PRAGMA foreign_keys = ON` and use `STRICT` tables.
- Wrap related writes in a `transaction()` helper with `BEGIN IMMEDIATE`, and never `await` inside it.
- Keep migrations append-only and versioned with `user_version`.
- Need Node 22.13 or newer (or reach for `better-sqlite3`).
