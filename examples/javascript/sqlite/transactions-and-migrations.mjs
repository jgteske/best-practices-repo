/**
 * Transactions and schema migrations with node:sqlite.
 *
 * node:sqlite has no transaction helper, so we write the ~10-line one everybody needs.
 *
 * Run: node examples/javascript/sqlite/transactions-and-migrations.mjs
 */

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

// #region transaction-helper
/** Run `fn` inside BEGIN/COMMIT; ROLLBACK and rethrow if it throws. */
function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE"); // take the write lock now, not halfway through
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
// #endregion transaction-helper

// #region transfer
const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE accounts (name TEXT PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0)) STRICT;
  INSERT INTO accounts VALUES ('alice', 100), ('bob', 50);
`);
const credit = db.prepare("UPDATE accounts SET balance = balance + ? WHERE name = ?");
const debit = db.prepare("UPDATE accounts SET balance = balance - ? WHERE name = ?");
const balances = () =>
  Object.fromEntries(db.prepare("SELECT name, balance FROM accounts ORDER BY name").all().map((r) => [r.name, r.balance]));

const transfer = (src, dst, amount) =>
  transaction(db, () => {
    credit.run(amount, dst);
    debit.run(amount, src); // throws on overdraft: the credit above is rolled back too
  });

transfer("alice", "bob", 30);
assert.deepEqual(balances(), { alice: 70, bob: 80 });
assert.throws(() => transfer("alice", "bob", 500), /CHECK constraint failed/);
assert.deepEqual(balances(), { alice: 70, bob: 80 }); // nothing half-applied
db.close();
// #endregion transfer

// #region migrations
// Append-only list; PRAGMA user_version records how many have run.
const MIGRATIONS = [
  "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL) STRICT",
  "ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00Z'",
  "CREATE INDEX notes_created_at ON notes (created_at)",
];

function migrate(db) {
  const { user_version: current } = db.prepare("PRAGMA user_version").get();
  MIGRATIONS.slice(current).forEach((sql, i) => {
    const version = current + i + 1;
    transaction(db, () => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version}`); // PRAGMA takes no parameters; an integer only
    });
    console.log(`applied migration ${version}`);
  });
  return MIGRATIONS.length;
}

const notes = new DatabaseSync(":memory:");
assert.equal(migrate(notes), 3);
assert.equal(migrate(notes), 3); // idempotent
notes.prepare("INSERT INTO notes (body) VALUES (?)").run("hello");
assert.equal(notes.prepare("SELECT created_at FROM notes").get().created_at, "1970-01-01T00:00:00Z");
notes.close();
// #endregion migrations
