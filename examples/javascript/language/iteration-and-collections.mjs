/**
 * Array methods, destructuring, the keyed collections, and the iterator protocol.
 *
 * Run: node examples/javascript/language/iteration-and-collections.mjs
 */

const orders = [
  { id: 1, customer: "ada", total: 120, status: "shipped" },
  { id: 2, customer: "grace", total: 80, status: "pending" },
  { id: 3, customer: "ada", total: 45, status: "shipped" },
  { id: 4, customer: "alan", total: 200, status: "cancelled" },
];

// --- map / filter / reduce: transform, select, collapse ------------------------

const shippedTotals = orders
  .filter((order) => order.status === "shipped")
  .map((order) => order.total);

console.log("array methods:");
console.log("  filter + map ......", shippedTotals.join(", "));
console.log("  reduce to a sum ...", shippedTotals.reduce((sum, n) => sum + n, 0));

// Always pass reduce an initial value: without one it uses element 0 as the seed
// and throws on an empty array.
console.log("  reduce of [] ......", [].reduce((sum, n) => sum + n, 0), "<- initial value saves you");

// Grouping is the reduce people reach for - but Object.groupBy (Node 21+) says it
// in one line and returns a null-prototype object.
const byCustomer = Object.groupBy(orders, (order) => order.customer);
console.log("  Object.groupBy ....", Object.keys(byCustomer).join(", "));

// find / some / every / flatMap round out the set:
console.log("  find ..............", orders.find((o) => o.total > 100)?.customer);
console.log("  some / every ......", orders.some((o) => o.total > 150), orders.every((o) => o.total > 10));
console.log("  flatMap ...........", orders.flatMap((o) => (o.status === "shipped" ? [o.id] : [])).join(", "));

// A chain builds an intermediate array per step. For a hot loop over a large
// array, or when you need to break out early, a plain for...of is clearer *and*
// faster - the readable choice is not always the method chain.
let firstBig;
for (const order of orders) {
  if (order.total > 100) {
    firstBig = order;
    break; // you cannot break out of .forEach()
  }
}
console.log("  for...of with break", firstBig?.id);

// --- Mutating vs non-mutating ---------------------------------------------------
// sort/reverse/splice mutate in place. The 2023 additions return copies instead.

const totals = [30, 10, 20];
const sortedCopy = totals.toSorted((a, b) => a - b);
console.log("\nmutation:");
console.log("  toSorted copy .....", sortedCopy.join(", "));
console.log("  original intact ...", totals.join(", "));
totals.sort((a, b) => a - b);
console.log("  sort mutated ......", totals.join(", "));
console.log("  at(-1) ............", totals.at(-1), "<- negative index, no length arithmetic");

// Default sort compares *strings*: [10, 9].sort() gives [10, 9]. Always pass a
// comparator for numbers.
console.log("  [10, 9].sort() ....", [10, 9].sort().join(", "), "<- lexicographic!");

// --- Destructuring, spread, rest ------------------------------------------------

const [first, ...restOrders] = orders;
const { customer, total: amount, missing = "default" } = first;

console.log("\ndestructuring:");
console.log("  array + rest ......", first.id, "then", restOrders.length, "more");
console.log("  rename + default ..", customer, amount, missing);

// Nested destructuring in a parameter list, with a default for the whole object:
function connect({ host = "localhost", port = 5432, ...options } = {}) {
  return `${host}:${port} ${JSON.stringify(options)}`;
}
console.log("  parameter object ..", connect({ port: 6379, tls: true }));

// Spread merges (later wins) and copies one level deep:
const defaults = { retries: 3, verbose: false };
console.log("  spread merge ......", JSON.stringify({ ...defaults, verbose: true }));

// --- Map and Set: use them when keys are not strings ----------------------------

const totalsByCustomer = new Map();
for (const order of orders) {
  totalsByCustomer.set(order.customer, (totalsByCustomer.get(order.customer) ?? 0) + order.total);
}

console.log("\ncollections:");
console.log("  Map size / get ....", totalsByCustomer.size, totalsByCustomer.get("ada"));
console.log("  Map iterates in insertion order:", [...totalsByCustomer.keys()].join(", "));

// A plain object coerces every key to a string and inherits from Object.prototype;
// a Map takes any value as a key, keeps insertion order, and has a real .size.
const objectKey = { id: 1 };
const keyedByObject = new Map([[objectKey, "identity, not string"]]);
console.log("  object as a key ...", keyedByObject.get(objectKey));
console.log("  plain object key ..", Object.keys({ [objectKey]: 1 })[0], "<- stringified");

const statuses = new Set(orders.map((o) => o.status));
console.log("  Set dedupes .......", [...statuses].join(", "));
console.log("  Set.has is O(1) ...", statuses.has("pending"));

// WeakMap keys are held weakly, so entries vanish when the key is garbage
// collected - the way to attach metadata to an object you do not own.
const metadata = new WeakMap();
metadata.set(objectKey, { seenAt: 0 });
console.log("  WeakMap lookup ....", JSON.stringify(metadata.get(objectKey)));

// --- The iterator protocol, and generators as the easy way to implement it ------

function* take(iterable, count) {
  let taken = 0;
  for (const value of iterable) {
    if (taken++ >= count) return;
    yield value; // laziness: nothing below runs until the consumer asks
  }
}

function* naturals() {
  for (let n = 1; ; n++) yield n; // infinite, and that is fine
}

console.log("\niterators:");
console.log("  lazy take from an infinite sequence:", [...take(naturals(), 5)].join(", "));

// Anything with a [Symbol.iterator] method works in for...of, spread, and
// destructuring - that is the whole protocol.
class Playlist {
  #tracks = ["intro", "verse", "chorus"];
  *[Symbol.iterator]() {
    yield* this.#tracks;
  }
}

const [opener, ...others] = new Playlist();
console.log("  custom iterable ...", opener, "+", others.length, "more");
console.log("  entries() gives index pairs:", [...["a", "b"].entries()].map(([i, v]) => `${i}:${v}`).join(" "));
