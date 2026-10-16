/**
 * node:sqlite basics: a synchronous SQLite database built into Node (22.13+ unflagged).
 *
 * Node prints "ExperimentalWarning: SQLite is an experimental feature" on first use.
 *
 * Run: node examples/javascript/sqlite/basics.mjs
 */

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

// #region connect
// ":memory:" is a private, throwaway database; a path creates a file.
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON"); // off by default, per connection
db.exec(`
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
`);
// #endregion connect

// #region prepared
// prepare() once, run many times. Values are bound as parameters, never spliced into SQL.
const insertUser = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)");
const ada = insertUser.run("ada@example.com", "Ada");
assert.equal(ada.lastInsertRowid, 1);
assert.equal(ada.changes, 1);

// Named parameters: `$name`, `:name` or `@name` in SQL; the object's keys may omit the prefix.
db.prepare("INSERT INTO users (email, name) VALUES ($email, $name)").run({
  email: "grace@example.com",
  name: "Grace",
});

const insertPost = db.prepare("INSERT INTO posts (user_id, title) VALUES (?, ?)");
for (const [userId, title] of [[1, "Engines"], [1, "Notes"], [2, "Compilers"]]) {
  insertPost.run(userId, title);
}
// #endregion prepared

// #region injection
const findUnsafe = (email) => db.prepare(`SELECT name FROM users WHERE email = '${email}'`).all();
const find = (email) => db.prepare("SELECT name FROM users WHERE email = ?").all(email);

const attack = "nobody@example.com' OR '1'='1";
assert.equal(findUnsafe(attack).length, 2); // every row leaked
assert.equal(find(attack).length, 0);
// #endregion injection

// #region rows
// get() -> first row or undefined; all() -> array; iterate() -> lazy iterator. Rows are plain objects.
const row = db.prepare("SELECT id, name FROM users WHERE email = ?").get("ada@example.com");
assert.deepEqual({ ...row }, { id: 1, name: "Ada" });
assert.equal(db.prepare("SELECT 1 FROM users WHERE email = ?").get("nobody@example.com"), undefined);

const posts = db
  .prepare("SELECT u.name, p.title FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id")
  .all();
for (const { name, title } of posts) console.log(`${name}: ${title}`);
// #endregion rows

// #region strict
// STRICT tables reject wrong types; foreign_keys rejects dangling references. Both throw.
assert.throws(() => insertPost.run("not-a-number", "x"), /cannot store TEXT value in INTEGER column/);
assert.throws(() => insertPost.run(99, "orphan"), /FOREIGN KEY constraint failed/);
db.close();
// #endregion strict
