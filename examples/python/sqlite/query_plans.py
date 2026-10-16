"""Indexes and EXPLAIN QUERY PLAN: see whether SQLite scans the table or uses an index.

Run it: python3 query_plans.py
"""

import sqlite3
from contextlib import closing


def plan(conn: sqlite3.Connection, sql: str, params: tuple[object, ...] = ()) -> str:
    """The `detail` column of EXPLAIN QUERY PLAN, one step per line."""
    return "\n".join(row[3] for row in conn.execute(f"EXPLAIN QUERY PLAN {sql}", params))


with closing(sqlite3.connect(":memory:", autocommit=False)) as conn:
    conn.execute(
        "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT NOT NULL, total INTEGER NOT NULL) STRICT"
    )
    with conn:
        conn.executemany(
            "INSERT INTO orders (customer, total) VALUES (?, ?)",
            ((f"c{i % 500}", i % 97) for i in range(20_000)),
        )

    # region scan-vs-search
    query = "SELECT total FROM orders WHERE customer = ?"
    before = plan(conn, query, ("c42",))
    assert before.startswith("SCAN orders")  # reads all 20,000 rows

    conn.execute("CREATE INDEX orders_customer ON orders (customer)")
    after = plan(conn, query, ("c42",))
    assert after.startswith("SEARCH orders USING INDEX orders_customer")
    print(f"  before: {before}\n  after:  {after}")
    # endregion scan-vs-search

    # region covering
    # An index that also holds the selected columns answers the query on its own.
    conn.execute("CREATE INDEX orders_customer_total ON orders (customer, total)")
    covering = plan(conn, query, ("c42",))
    assert "COVERING INDEX" in covering
    print(f"  covering: {covering}")

    # A function on the indexed column hides it from the index.
    hidden = plan(conn, "SELECT total FROM orders WHERE lower(customer) = ?", ("c42",))
    assert "SCAN" in hidden
    # endregion covering
