"""sqlite3 basics: connect, create, insert with placeholders, read rows.

Run it: python3 basics.py
"""

import sqlite3

# region connect
# ":memory:" is a private, throwaway database - perfect for tests and examples.
# A path ("app.db") creates the file on first use. Close it when done (or use contextlib.closing).
conn = sqlite3.connect(":memory:", autocommit=True)
# Foreign keys are OFF by default, per connection. The PRAGMA is silently ignored inside
# a transaction - and with autocommit=False one is always open - so set it first...
conn.execute("PRAGMA foreign_keys = ON")
conn.autocommit = False  # ...then switch to explicit transactions.
assert conn.execute("PRAGMA foreign_keys").fetchone() == (1,)
conn.executescript("""
    CREATE TABLE users (
        id    INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name  TEXT NOT NULL
    ) STRICT;
    CREATE TABLE posts (
        id      INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title   TEXT NOT NULL
    ) STRICT;
""")
# endregion connect


# region placeholders
# Values go in as parameters - "?" (positional) or ":name" (named). Never build SQL
# with f-strings: the driver sends parameters separately, so they can't change the query.
conn.execute("INSERT INTO users (email, name) VALUES (?, ?)", ("ada@example.com", "Ada"))
conn.execute(
    "INSERT INTO users (email, name) VALUES (:email, :name)",
    {"email": "grace@example.com", "name": "Grace"},
)
conn.executemany(
    "INSERT INTO posts (user_id, title) VALUES (?, ?)",
    [(1, "Engines"), (1, "Notes"), (2, "Compilers")],
)
conn.commit()
# endregion placeholders


# region injection
def find_user_unsafe(email: str) -> list[tuple[str]]:
    # DON'T: the input becomes part of the SQL text.
    return conn.execute(f"SELECT name FROM users WHERE email = '{email}'").fetchall()


def find_user(email: str) -> list[tuple[str]]:
    return conn.execute("SELECT name FROM users WHERE email = ?", (email,)).fetchall()


attack = "nobody@example.com' OR '1'='1"
assert find_user_unsafe(attack) == [("Ada",), ("Grace",)]  # every row leaked
assert find_user(attack) == []  # just a strange email address
print(f"  unsafe query returned {len(find_user_unsafe(attack))} rows for {attack!r}")
# endregion injection


# region rows
# Rows are tuples by default. sqlite3.Row allows access by column name as well.
conn.row_factory = sqlite3.Row
row = conn.execute("SELECT id, name FROM users WHERE email = ?", ("ada@example.com",)).fetchone()
assert row is not None
assert (row["id"], row["name"]) == (1, "Ada")

# fetchone() -> one row or None; fetchall() -> list; iterating the cursor streams rows.
for post in conn.execute(
    "SELECT u.name, p.title FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id"
):
    print(f"  {post['name']}: {post['title']}")
# endregion rows


# region strict
# STRICT tables (SQLite 3.37+) reject values of the wrong type instead of storing them anyway.
bad_rows = [
    ("not-a-number", "wrong type"),
    (99, "no such user"),  # and with foreign_keys ON, a dangling reference is rejected too
]
for user_id, title in bad_rows:
    try:
        conn.execute("INSERT INTO posts (user_id, title) VALUES (?, ?)", (user_id, title))
    except sqlite3.IntegrityError as error:
        print(f"  {title}: {error}")
    else:
        raise AssertionError(f"{title!r} was accepted")
conn.rollback()
conn.close()
# endregion strict
