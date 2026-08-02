/**
 * Streams: processing more data than fits in memory, with backpressure and
 * error handling you do not have to write yourself.
 *
 * Run: node examples/javascript/node/streams-pipeline.mjs
 */

import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform, Readable } from "node:stream";
import { createGzip } from "node:zlib";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import path from "node:path";

const workDir = await mkdtemp(path.join(tmpdir(), "streams-example-"));
const logPath = path.join(workDir, "access.log");

// Build a sample log file: 5,000 lines, a mix of levels.
const lines = Array.from({ length: 5_000 }, (_, i) => {
  const level = i % 97 === 0 ? "ERROR" : i % 7 === 0 ? "WARN" : "INFO";
  return `2026-07-31T00:00:00Z ${level} request ${i} completed in ${i % 250}ms`;
});
await writeFile(logPath, lines.join("\n") + "\n");

try {
  // --- A pipeline: read -> transform -> compress -> write ------------------------
  //
  // `pipeline()` is the only correct way to chain streams. Chaining with .pipe()
  // does not forward errors and does not destroy the upstream sources when one
  // link fails, which is how you end up with leaked file descriptors.

  const errorsOnly = new Transform({
    // Object mode is off here, so chunks are Buffers of arbitrary size - a chunk
    // boundary can land mid-line, which is exactly why the line-splitting job
    // below is left to readline rather than done by hand.
    transform(chunk, _encoding, callback) {
      const text = this.leftover ? this.leftover + chunk.toString("utf8") : chunk.toString("utf8");
      const parts = text.split("\n");
      this.leftover = parts.pop(); // hold the partial line back for the next chunk
      const kept = parts.filter((line) => line.includes("ERROR"));
      callback(null, kept.length ? kept.join("\n") + "\n" : "");
    },
    flush(callback) {
      callback(null, this.leftover && this.leftover.includes("ERROR") ? this.leftover + "\n" : "");
    },
  });

  const gzPath = path.join(workDir, "errors.log.gz");
  await pipeline(createReadStream(logPath), errorsOnly, createGzip(), createWriteStream(gzPath));

  const [sourceStats, gzStats] = await Promise.all([stat(logPath), stat(gzPath)]);
  console.log("pipeline:");
  console.log(`  ${sourceStats.size} bytes in -> ${gzStats.size} bytes out (filtered + gzipped)`);
  console.log("  peak memory held: one chunk at a time, not the whole file");

  // --- Async iteration: the readable way to consume a stream ---------------------
  // A readable stream is an async iterable, so `for await` handles backpressure
  // for you - the source is paused while your loop body is awaiting.

  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  const reader = createInterface({
    input: createReadStream(logPath),
    crlfDelay: Infinity, // treat \r\n as one break
  });

  for await (const line of reader) {
    const level = line.split(" ")[1];
    if (level in counts) counts[level] += 1;
  }

  console.log("\nline-by-line with readline:");
  console.log("  counted", Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "));

  // --- Reading it all at once, for comparison -------------------------------------
  const whole = await readFile(logPath, "utf8");
  console.log("\nreadFile for comparison:");
  console.log(`  same ${whole.split("\n").length - 1} lines, but the entire file was resident`);
  console.log(`  fine at ${Math.round(sourceStats.size / 1024)}KB; an out-of-memory crash at 25GB`);

  // --- Making your own source ------------------------------------------------------
  // Readable.from turns any (async) iterable into a stream, which is usually
  // easier than implementing _read() by hand.

  async function* generateRows() {
    for (let i = 0; i < 3; i++) yield `row-${i}\n`;
  }

  const collected = [];
  await pipeline(Readable.from(generateRows()), async function* (source) {
    for await (const chunk of source) collected.push(chunk.toString().trim());
  });
  console.log("\nReadable.from a generator:", collected.join(", "));

  // --- Errors propagate, and everything gets destroyed ------------------------------
  const exploding = new Transform({
    transform(_chunk, _encoding, callback) {
      callback(new Error("transform blew up"));
    },
  });

  try {
    await pipeline(createReadStream(logPath), exploding, createWriteStream(path.join(workDir, "never.txt")));
  } catch (error) {
    console.log("\nerror handling:");
    console.log("  pipeline rejected:", error.message);
    console.log("  every stream in the chain was destroyed - no leaked descriptors");
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}
