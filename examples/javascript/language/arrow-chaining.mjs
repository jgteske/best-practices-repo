/**
 * Arrow chaining: functions that return functions, and how to compose them.
 *
 * Run: node examples/javascript/language/arrow-chaining.mjs
 */

// --- How a chain of arrows parses ----------------------------------------------
// `=>` is right-associative, so the body of each arrow is the *next* arrow.
// These two are the same function, written at two levels of sugar:

const addVerbose = function (a) {
  return function (b) {
    return a + b;
  };
};

const addChained = (a) => (b) => a + b;

console.log("how a chain parses:");
console.log("  addVerbose(2)(3) .....", addVerbose(2)(3));
console.log("  addChained(2)(3) .....", addChained(2)(3));
console.log("  addChained(2) ........", typeof addChained(2), "<- one call returns a function, not a number");

// The one syntax trap: a `{` after `=>` is parsed as a *block*, not an object
// literal. Wrap the object in parentheses to return it.
const brokenShape = (id) => {
  id;
}; // returns undefined - the braces are a block, and `id` is just a statement in it
const objectShape = (id) => ({ id });
console.log("  => { id } ............", brokenShape(1), "<- block body, no return");
console.log("  => ({ id }) ..........", JSON.stringify(objectShape(1)), "<- parens make it an object");

// --- Currying: bake in the arguments you know now ------------------------------

const orders = [
  { id: 1, customer: "ada", total: 120, status: "shipped" },
  { id: 2, customer: "grace", total: 80, status: "pending" },
  { id: 3, customer: "ada", total: 45, status: "shipped" },
  { id: 4, customer: "alan", total: 200, status: "cancelled" },
];

// Each arrow layer captures its argument in a closure, so the innermost function
// still sees `key` long after `pluck("total")` returned.
const pluck = (key) => (row) => row[key];
const isStatus = (status) => (row) => row.status === status;

const shippedTotals = orders.filter(isStatus("shipped")).map(pluck("total"));

console.log("\ncurrying:");
console.log("  filter + map .........", shippedTotals.join(", "));

// Partial application is the payoff: the configured function is a value you can
// name, reuse, and pass on.
const isShipped = isStatus("shipped");
console.log("  named partial ........", orders.filter(isShipped).length, "shipped orders");

// Argument order decides how reusable a curried function is: configuration
// first, data last, so the data-taking function is what falls out at the end.
const formatMoney = (currency) => (cents) => `${currency}${(cents / 100).toFixed(2)}`;
const eur = formatMoney("EUR ");
console.log("  config first, data last", orders.map(pluck("total")).map(eur).join(" / "));

// --- pipe and compose ----------------------------------------------------------
// Both are one-liners. `pipe` reads left to right, which is why it wins in
// practice; `compose` matches the maths notation f(g(x)).

const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);
const compose = (...fns) => (input) => fns.reduceRight((value, fn) => fn(value), input);

const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const dashes = (s) => s.replaceAll(" ", "-");

const slugify = pipe(trim, lower, dashes);

console.log("\npipe / compose:");
console.log("  pipe .................", slugify("  Hello Arrow World  "));
console.log("  compose ..............", compose(dashes, lower, trim)("  Hello Arrow World  "));
console.log("  same steps, reversed .", slugify("  A B  ") === compose(dashes, lower, trim)("  A B  "));

// --- Chained arrows as wrappers (the pattern worth learning) -------------------
// `(config) => (fn) => (...args) => ...` is the shape of every decorator: take
// options, take the function to wrap, return a drop-in replacement.

const calls = [];

const withLog = (label) => (fn) => async (...args) => {
  calls.push(label);
  return fn(...args);
};

const withRetry = (attempts) => (fn) => async (...args) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(...args);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`failed after ${attempts} attempts`, { cause: lastError });
};

// A deterministic "flaky" dependency: fails twice, then succeeds.
let failuresLeft = 2;
const fetchUser = async (id) => {
  if (failuresLeft-- > 0) throw new Error("connection reset");
  return { id, name: "ada" };
};

// Wrappers stack. Read the composed name from the inside out: retry the fetch,
// then log the retrying version.
const loadUser = withLog("loadUser")(withRetry(3)(fetchUser));

console.log("\nwrapper chains:");
console.log("  result ...............", JSON.stringify(await loadUser(7)));
console.log("  log entries ..........", calls.join(", "), "<- logging outside retry sees one call");

// Order matters. Swap the two and the logger sits *inside* the retry loop, so it
// records every attempt instead of the one logical call.
calls.length = 0;
failuresLeft = 2;
const loadUserVerbose = withRetry(3)(withLog("attempt")(fetchUser));
await loadUserVerbose(7);
console.log("  swapped order ........", calls.join(", "), "<- logging inside retry sees each attempt");

// The same stack, assembled with pipe - which is where the config-first shape
// pays off, because each `withX(config)` is already a fn -> fn transform.
const harden = pipe(withRetry(3), withLog("harden"));
failuresLeft = 1;
console.log("  piped wrapper ........", JSON.stringify(await harden(fetchUser)(9)));

// A wrapper that swallows the error rather than rethrowing gives you a total
// function - useful at a boundary where "no user" is a normal answer.
const orNull = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch {
    return null;
  }
};

failuresLeft = 5;
console.log("  orNull(...) ..........", await orNull(fetchUser)(1), "<- error became a value");

// --- Where chaining stops paying -----------------------------------------------
// Every arrow you add is a level of indirection the next reader has to unwind,
// and an anonymous frame in the stack trace. Past two or three layers, or when
// the intermediate function has a real meaning, name it.

const terse = (a) => (b) => (c) => (d) => a + b + c + d; // clever, unreadable
const clear = (base) => {
  const withTax = (rate) => Math.round(base * (1 + rate));
  return withTax;
};

console.log("\nreadability:");
console.log("  terse chain ..........", terse(1)(2)(3)(4), "<- what are the four arguments?");
console.log("  named step ...........", clear(1000)(0.2), "<- `withTax` says it");
