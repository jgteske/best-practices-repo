"""Transactions with sqlite3: all-or-nothing changes, and how `with conn:` really behaves.

Run it: python3 transactions.py
"""

import sqlite3
from contextlib import closing

SCHEMA = """
    CREATE TABLE accounts (
        name    TEXT PRIMARY KEY,
        balance INTEGER NOT NULL CHECK (balance >= 0)
    ) STRICT;
    INSERT INTO accounts VALUES ('alice', 100), ('bob', 50);
"""


def balances(conn: sqlite3.Connection) -> dict[str, int]:
    return dict(conn.execute("SELECT name, balance FROM accounts ORDER BY name").fetchall())


# region with-conn
def transfer(conn: sqlite3.Connection, src: str, dst: str, amount: int) -> None:
    # `with conn:` commits if the block succeeds and rolls back if it raises.
    # It does NOT close the connection - that is what closing() below is for.
    with conn:
        conn.execute("UPDATE accounts SET balance = balance + ? WHERE name = ?", (amount, dst))
        conn.execute("UPDATE accounts SET balance = balance - ? WHERE name = ?", (amount, src))


with closing(sqlite3.connect(":memory:", autocommit=False)) as conn:
    conn.executescript(SCHEMA)
    conn.commit()

    transfer(conn, "alice", "bob", 30)
    assert balances(conn) == {"alice": 70, "bob": 80}

    # The second UPDATE violates the CHECK; the first (crediting bob) is rolled back with it.
    try:
        transfer(conn, "alice", "bob", 500)
    except sqlite3.IntegrityError as error:
        print(f"  transfer refused: {error}")
    else:
        raise AssertionError("overdraft was accepted")
    assert balances(conn) == {"alice": 70, "bob": 80}  # nothing half-applied
# endregion with-conn


# region autocommit
# Python 3.12 added the `autocommit` parameter. Its three values:
#   autocommit=False   - PEP 249 behaviour: a transaction is always open; commit()/rollback()
#                        end it and start the next. What the examples here use.
#   autocommit=True    - SQLite's own autocommit: each statement commits on its own,
#                        and you write BEGIN/COMMIT yourself.
#   (default) LEGACY_TRANSACTION_CONTROL - the pre-3.12 behaviour: an implicit BEGIN
#                        before INSERT/UPDATE/DELETE only. Works, but surprises people.
with closing(sqlite3.connect(":memory:", autocommit=True)) as conn:
    conn.executescript(SCHEMA)
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = 0 WHERE name = 'bob'")
    conn.execute("ROLLBACK")
    assert balances(conn) == {"alice": 100, "bob": 50}
# endregion autocommit


# region batching
# Each commit is a durable write (an fsync) on a file database. Wrapping a bulk insert
# in ONE transaction is often 100x faster than committing per row.
with closing(sqlite3.connect(":memory:", autocommit=False)) as conn:
    conn.execute("CREATE TABLE events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL) STRICT")
    with conn:
        conn.executemany("INSERT INTO events (kind) VALUES (?)", ((f"k{i % 3}",) for i in range(10_000)))
    (count,) = conn.execute("SELECT count(*) FROM events").fetchone()
    assert count == 10_000
# endregion batching
