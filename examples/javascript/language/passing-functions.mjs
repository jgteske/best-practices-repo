/**
 * Passing functions as values: callbacks, thunks, factories, and the traps.
 *
 * Run: node examples/javascript/language/passing-functions.mjs
 */

// --- Pass it, call it, or wrap it ----------------------------------------------

const greet = (name) => `hello ${name}`;

const apply = (fn, value) => fn(value); // takes the function itself
const runLater = (thunk) => thunk(); // takes a zero-argument function

console.log("pass vs call:");
console.log("  apply(greet, 'ada') ...", apply(greet, "ada"), "<- greet, no parens: the function is the argument");
console.log("  runLater(() => ...) ...", runLater(() => greet("grace")), "<- a thunk defers the call and pre-binds the args");

// `greet("alan")` as an argument passes the *result*. That is a bug when the
// callee meant to call it later (or twice, or never).
console.log("  apply(greet('alan')) ..", typeof greet("alan"), "<- a string; nothing left to call");

// --- The trap: callbacks receive more arguments than you think -----------------
// Array callbacks are called with (element, index, array). A one-parameter
// function ignores the extras; a multi-parameter one silently consumes them.

const numeric = ["1", "7", "11"];

console.log("\nextra arguments:");
console.log("  map(parseInt) .........", numeric.map(parseInt).join(", "), "<- parseInt(str, radix) reads the index as the radix");
console.log("  map(Number) ...........", numeric.map(Number).join(", "), "<- Number takes exactly one argument");
console.log("  map((s) => ...) .......", numeric.map((s) => parseInt(s, 10)).join(", "), "<- the wrapping arrow fixes the arity");

// The same trap with any function that has optional parameters:
const round = (value, digits = 0) => Number(value.toFixed(digits));
console.log("  map(round) ............", [1.234, 5.678].map(round).join(", "), "<- the index landed in `digits`");
console.log("  map((n) => round(n, 1))", [1.234, 5.678].map((n) => round(n, 1)).join(", "));

// --- The trap: a passed method loses its receiver ------------------------------

const counter = {
  count: 0,
  increment() {
    this.count += 1;
    return this.count;
  },
};

const callTwice = (fn) => {
  fn();
  return fn();
};

console.log("\nlosing `this`:");
try {
  callTwice(counter.increment); // detached: `this` is undefined
} catch (error) {
  console.log("  bare method ...........", `${error.constructor.name}: this is undefined`);
}
console.log("  wrapped in an arrow ...", callTwice(() => counter.increment()), "<- clearest fix");
counter.count = 0;
console.log("  .bind(counter) ........", callTwice(counter.increment.bind(counter)), "<- same result, bound once");

// --- Functions as parameters: factories beat flags -----------------------------
// A function argument is how you leave a decision to the caller. Prefer taking a
// predicate/comparator over taking a string or boolean and branching on it.

const people = [
  { name: "ada", age: 36 },
  { name: "grace", age: 45 },
  { name: "alan", age: 41 },
];

// A comparator factory: `by` builds the function `sort` wants.
const by = (key) => (a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0);
const desc = (comparator) => (a, b) => -comparator(a, b);

console.log("\nfunction parameters:");
console.log("  sort by name ..........", people.toSorted(by("name")).map((p) => p.name).join(", "));
console.log("  sort by age, desc .....", people.toSorted(desc(by("age"))).map((p) => p.name).join(", "));

// Injecting a function instead of hard-coding a dependency is what makes code
// testable without a mocking library: the default is real, the test passes a fake.
const isExpired = (token, now = () => Date.now()) => token.expiresAt <= now();
const token = { expiresAt: 1_000 };

console.log("  injected clock (real) .", isExpired(token), "<- Date.now() is well past 1000");
console.log("  injected clock (fake) .", isExpired(token, () => 500), "<- deterministic in a test");

// --- Function identity: every arrow expression is a new object ------------------
// Two arrows with identical source are different values. Anything that
// de-duplicates, caches, or unsubscribes by reference needs a *stable* function.

const listeners = new Set();
const subscribe = (fn) => listeners.add(fn);
const unsubscribe = (fn) => listeners.delete(fn);

subscribe(() => console.log("tick"));
unsubscribe(() => console.log("tick")); // a different function object

const onTick = () => console.log("tick");
subscribe(onTick);
unsubscribe(onTick); // the same reference, so it actually comes off

console.log("\nfunction identity:");
console.log("  (() => {}) === (() => {})", (() => {}) === (() => {}));
console.log("  leftover listeners ....", listeners.size, "<- the inline arrow could never be removed");

// The same rule drives memoisation: the cache key is the function's *output*, so
// the wrapped function has to stay one object for the cache to survive.
const memoize = (fn, cache = new Map()) => (arg) => {
  if (!cache.has(arg)) cache.set(arg, fn(arg));
  return cache.get(arg);
};

let slowCalls = 0;
const slowSquare = (n) => {
  slowCalls++;
  return n * n;
};
const fastSquare = memoize(slowSquare);

fastSquare(9);
fastSquare(9);
console.log("  memoized, called twice ", fastSquare(9), `(underlying calls: ${slowCalls})`);

// --- Naming the function you pass ----------------------------------------------
// An extracted, named function documents the intent and shows up in stack traces
// and profiles. Inline arrows are right for one-liners, not for logic.

const isActiveAdmin = (user) => user.active && user.role === "admin";
const users = [
  { name: "ada", active: true, role: "admin" },
  { name: "grace", active: false, role: "admin" },
  { name: "alan", active: true, role: "user" },
];

console.log("\nnaming:");
console.log("  inline ................", users.filter((u) => u.active && u.role === "admin").length);
console.log("  named predicate .......", users.filter(isActiveAdmin).length, "<- reads as a sentence, and it is reusable");
