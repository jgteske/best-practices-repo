# SQL with sqlite3

SQLite is a complete SQL database inside one file, and Python ships a driver
for it in the standard library. It suits tests, CLIs, desktop apps, caches and
many small web apps. Most of what makes database code correct (placeholders,
transactions, migrations, indexes) works the same way in PostgreSQL and MySQL,
so SQLite is also the cheapest place to learn it.

Examples: [`examples/python/sqlite`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/sqlite).
Each one uses an in-memory database, so it runs anywhere and leaves nothing
behind. The JavaScript version of this page is [SQL with node:sqlite](../javascript/sqlite).

## Connecting and creating tables

<<< ../../examples/python/sqlite/basics.py#connect

Three details here bite people:

- **`PRAGMA foreign_keys = ON` is per connection and off by default.**
  `REFERENCES` clauses are parsed and then ignored unless you turn it on. Inside
  a transaction the PRAGMA is also **silently ignored**, and with
  `autocommit=False` a transaction is always open. This example's first version
  set it after connecting with `autocommit=False`, and orphan rows went in
  without an error. Set it before your first transaction, as above.
- **`STRICT` tables** (SQLite 3.37+) make column types real. Without `STRICT`,
  SQLite stores `"not-a-number"` in an `INTEGER` column without complaint.
- `executescript()` runs several statements. It **commits any open transaction
  first**, so don't use it in the middle of a transaction.

## Placeholders, always

<<< ../../examples/python/sqlite/basics.py#placeholders

Values are passed separately from the SQL text, either `?` with a tuple or
`:name` with a dict. `executemany()` runs one statement for many parameter
rows. Placeholders work only for **values**. Table and column names can't be
parameters, so pick those from a fixed allow-list in your code.

### Why: SQL injection, live

<<< ../../examples/python/sqlite/basics.py#injection

```
  unsafe query returned 2 rows for "nobody@example.com' OR '1'='1"
```

The f-string version turns the input into SQL, so `' OR '1'='1` rewrites the
`WHERE` clause and the query returns every user. The placeholder version
compares against that exact string and finds nothing. This is still the most
common serious security bug in web applications, and placeholders prevent it
completely.

## Reading rows

<<< ../../examples/python/sqlite/basics.py#rows

```
  Ada: Engines
  Ada: Notes
  Grace: Compilers
```

`sqlite3.Row` gives you access by column name and still behaves like a tuple.
Iterate the cursor to stream large results instead of calling `fetchall()`.

### Constraints are your last line of defence

<<< ../../examples/python/sqlite/basics.py#strict

```
  wrong type: cannot store TEXT value in INTEGER column posts.user_id
  no such user: FOREIGN KEY constraint failed
```

`NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES` and `STRICT` hold for every client
that writes to the database, including the buggy ones and the one-off script
someone runs next year. Validate in your code for good error messages, and
enforce the rule in the schema as well.

## Transactions

<<< ../../examples/python/sqlite/transactions.py#with-conn

```
  transfer refused: CHECK constraint failed: balance >= 0
```

A transaction makes several statements **all-or-nothing**. The transfer
credits Bob *before* it debits Alice. When the debit fails, the rollback
undoes the credit too, so no money is created out of thin air.

`with conn:` is a **transaction** context manager. It commits on success and
rolls back on exception, but it **does not close** the connection. Use
`contextlib.closing(conn)` for that, as the examples do.

### The `autocommit` parameter (3.12+)

<<< ../../examples/python/sqlite/transactions.py#autocommit

New code should pass `autocommit=False`. Each `commit()` or `rollback()` then
starts the next transaction, so you never write to the database outside one.
The legacy default opens transactions only before DML statements. That
surprises people who expect `CREATE TABLE` or `SELECT` to be covered as well.

### Batch writes in one transaction

<<< ../../examples/python/sqlite/transactions.py#batching

On a file database, each commit waits for the disk to confirm the write. Ten
thousand single-row commits are ten thousand of those waits, while one
transaction around the batch is one wait. For a database written by several
processes, also enable `PRAGMA journal_mode = WAL`, which lets readers run
alongside one writer.

## Migrations without a framework

<<< ../../examples/python/sqlite/migrations.py#migrations

<<< ../../examples/python/sqlite/migrations.py#run

```
  applied migration 2
  applied migration 3
```

`PRAGMA user_version` is an integer SQLite stores in the database header for
your own use. That is enough to record which migrations have run. Each step
runs in its own transaction **together with** its version bump, so a crash
can't leave the schema changed but unrecorded. The list is append-only:
editing a shipped migration means databases that already ran it never get the
fix. Alembic (for SQLAlchemy) and yoyo-migrations give you the same idea with
down-migrations and branching.

## Indexes and `EXPLAIN QUERY PLAN`

<<< ../../examples/python/sqlite/query_plans.py#scan-vs-search

```
  before: SCAN orders
  after:  SEARCH orders USING INDEX orders_customer (customer=?)
```

`SCAN` means SQLite reads every row. `SEARCH ... USING INDEX` means it jumps
straight to the matching ones. Look at the plan instead of guessing. Ask "what
does this query do?", not "is it fast on my 20 test rows?".

<<< ../../examples/python/sqlite/query_plans.py#covering

```
  covering: SEARCH orders USING COVERING INDEX orders_customer_total (customer=?)
```

A **covering** index contains every column the query needs, so SQLite never
reads the table at all. Wrapping the indexed column in a function
(`lower(customer)`) hides it from the index. Store normalised values, or create
an expression index on `lower(customer)`.

Indexes aren't free. Each one costs disk space and slows down every write, so
add one for a query you actually run.

## Rules of thumb

- Use placeholders for every value. Build identifiers only from an allow-list.
- Run `PRAGMA foreign_keys = ON` on every connection, before the first transaction.
- Use `STRICT` tables, and put `NOT NULL`/`CHECK`/`UNIQUE` in the schema.
- Connect with `autocommit=False`, put related writes in `with conn:`, and close with `closing()`.
- Batch bulk writes into one transaction.
- Keep migrations append-only, versioned with `user_version`, one transaction per step.
- Check `EXPLAIN QUERY PLAN` before and after adding an index.
