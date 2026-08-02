/**
 * Files and paths: the promise-based fs API, and why every path goes through
 * node:path.
 *
 * Run: node examples/javascript/node/fs-and-path.mjs
 */

import { mkdtemp, writeFile, readFile, readdir, stat, rm, mkdir, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// --- Paths -------------------------------------------------------------------------
// Never build a path with string concatenation: you get "dir//file" or the wrong
// separator, and a "../" inside user input walks straight out of your directory.

const base = path.join(import.meta.dirname, "..", "modules");
console.log("paths:");
console.log("  join normalises .....", path.basename(path.dirname(base)) + "/" + path.basename(base));
console.log("  resolve is absolute .", path.isAbsolute(path.resolve("a", "b")));
console.log("  parse ...............", JSON.stringify(path.parse("/srv/app/report.tar.gz")));
console.log("  extname .............", path.extname("report.tar.gz"), "<- only the last one");
console.log("  relative ............", path.relative("/srv/app", "/srv/logs/today.log"));

// The containment check to actually use, when a path comes from outside:
const uploadsDir = path.resolve("/srv/uploads");
const requested = path.resolve(uploadsDir, "../etc/passwd"); // hostile input
const isContained = requested === uploadsDir || requested.startsWith(uploadsDir + path.sep);
console.log("  traversal blocked ...", !isContained, `(${requested})`);

// --- Reading and writing ------------------------------------------------------------

const workDir = await mkdtemp(path.join(tmpdir(), "fs-example-"));
const filePath = path.join(workDir, "notes.txt");

try {
  await writeFile(filePath, "first line\n", "utf8"); // creates or truncates
  await appendFile(filePath, "second line\n", "utf8");

  const contents = await readFile(filePath, "utf8"); // without the encoding you get a Buffer
  console.log("\nfiles:");
  console.log("  read back ...........", JSON.stringify(contents));
  console.log("  as a Buffer .........", (await readFile(filePath)).subarray(0, 5));

  // recursive: true makes mkdir idempotent - no "does it exist?" check needed.
  await mkdir(path.join(workDir, "nested", "deep"), { recursive: true });

  // withFileTypes avoids a stat() call per entry.
  const entries = await readdir(workDir, { withFileTypes: true });
  for (const entry of entries) {
    console.log(`  ${entry.isDirectory() ? "dir " : "file"} ${entry.name}`);
  }

  const stats = await stat(filePath);
  console.log("  size / mtime ........", stats.size, "bytes,", stats.mtime.toISOString().slice(0, 10));

  // Don't check-then-act. Between existsSync() and the open() the answer can
  // change, and you have written a race condition. Just try it and handle ENOENT.
  console.log("\nerror handling:");
  console.log("  existsSync says .....", existsSync(path.join(workDir, "missing.txt")));
  try {
    await readFile(path.join(workDir, "missing.txt"), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error; // rethrow anything unexpected
    console.log("  ENOENT handled ......", "the errno code is the API, not the message");
  }
} finally {
  // force ignores "already gone"; recursive removes the tree.
  await rm(workDir, { recursive: true, force: true });
  console.log("  temp dir cleaned up .", !existsSync(workDir));
}

// --- Which API to use ----------------------------------------------------------------
//
//   node:fs/promises  - the default. await, and errors arrive as rejections.
//   node:fs (sync)    - startup config only. It blocks the entire event loop.
//   node:fs (callback)- older code; the promise API covers everything.
//   streams           - anything whose size you do not control. See streams-pipeline.mjs.
//
// readFile pulls the whole file into memory. That is fine for a 4KB config and a
// production incident for a 4GB log.
