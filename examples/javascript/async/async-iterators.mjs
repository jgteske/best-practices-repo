/**
 * Async generators and for await...of: streaming a sequence you cannot hold in
 * memory all at once.
 *
 * Run: node examples/javascript/async/async-iterators.mjs
 */

import { setTimeout as delay } from "node:timers/promises";
import { EventEmitter, on, once } from "node:events";

// A paginated API is the canonical case: you want "every item", the server only
// offers "one page at a time", and you do not want all pages in memory at once.
const PAGES = [
  { items: ["a", "b"], nextCursor: "p2" },
  { items: ["c", "d"], nextCursor: "p3" },
  { items: ["e"], nextCursor: null },
];

async function fetchPage(cursor) {
  await delay(5); // stand-in for the network
  return PAGES[cursor ? Number(cursor.slice(1)) - 1 : 0];
}

// `async function*` gives you a lazy, awaitable sequence. Nothing is fetched
// until the consumer asks for the next item, and the loop below never holds
// more than one page.
async function* allItems() {
  let cursor = null;
  do {
    const page = await fetchPage(cursor);
    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor);
}

console.log("streaming a paginated API:");
for await (const item of allItems()) {
  process.stdout.write(`  ${item}`);
}
console.log();

// Early exit is safe: breaking out of a for-await loop calls the generator's
// .return(), so a `finally` block gets to release whatever it holds open.
async function* withCleanup() {
  try {
    for (let n = 1; ; n++) {
      yield n;
      await delay(1);
    }
  } finally {
    console.log("  generator cleaned up on break");
  }
}

console.log("\nearly exit:");
for await (const n of withCleanup()) {
  if (n === 3) break;
  process.stdout.write(`  saw ${n}`);
}
console.log();

// --- for await is sequential by design -------------------------------------------
// It waits for each item before requesting the next. That is the point when the
// source is a stream - and the wrong tool when you have N independent promises.

const urls = ["one", "two", "three"];

const sequentialStart = Date.now();
for await (const value of urls.map((u) => delay(30, u))) {
  void value; // the promises all started at .map() time, so this one is cheap...
}
console.log(`\nfor await over an array of promises: ~${Date.now() - sequentialStart}ms`);
console.log("  (they were all started by .map(), so this is fine - but if the work");
console.log("   started inside the loop body it would have been 3x slower)");

// Node exposes async iteration on the things you would hope for: streams,
// readline, and events.
const emitter = new EventEmitter();
setTimeout(() => emitter.emit("ready", "payload"), 5);
const [payload] = await once(emitter, "ready");
console.log("\nevents.once as a promise:", payload);

const ticker = new EventEmitter();
let tick = 0;
const interval = setInterval(() => ticker.emit("tick", ++tick), 5);

console.log("events.on as an async iterator:");
for await (const [value] of on(ticker, "tick")) {
  process.stdout.write(`  tick ${value}`);
  if (value === 3) break; // without a break this loop never ends
}
clearInterval(interval);
console.log();
