"""Schema migrations without a framework: numbered steps and PRAGMA user_version.

Run it: python3 migrations.py
"""

import sqlite3
from contextlib import closing

# region migrations
# Append-only: never edit a migration that has shipped; add a new one.
MIGRATIONS: list[str] = [
    # 1: initial schema
    """
    CREATE TABLE notes (
        id   INTEGER PRIMARY KEY,
        body TEXT NOT NULL
    ) STRICT;
    """,
    # 2: add a column with a default, so existing rows stay valid
    "ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00+00:00';",
    # 3: an index for the query the app runs most
    "CREATE INDEX notes_created_at ON notes (created_at);",
]


def migrate(conn: sqlite3.Connection) -> int:
    """Apply every migration newer than the database's user_version. Returns the new version."""
    (current,) = conn.execute("PRAGMA user_version").fetchone()
    for version, sql in enumerate(MIGRATIONS[current:], start=current + 1):
        # One transaction per step: the schema change and the version bump land together.
        # (Avoid executescript() here - it COMMITs any open transaction first.)
        with conn:
            for statement in filter(str.strip, sql.split(";")):
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {version}")  # PRAGMA takes no parameters; int only
        print(f"  applied migration {version}")
    return len(MIGRATIONS)


# endregion migrations


# region run
with closing(sqlite3.connect(":memory:", autocommit=False)) as conn:
    # An "old" database that already ran migration 1:
    with conn:
        conn.execute(MIGRATIONS[0])
        conn.execute("PRAGMA user_version = 1")
    conn.execute("INSERT INTO notes (body) VALUES ('written before v2')")
    conn.commit()

    assert migrate(conn) == 3  # applies 2 and 3
    assert migrate(conn) == 3  # idempotent: nothing left to apply
    row = conn.execute("SELECT body, created_at FROM notes").fetchone()
    assert row == ("written before v2", "1970-01-01T00:00:00+00:00")
# endregion run
