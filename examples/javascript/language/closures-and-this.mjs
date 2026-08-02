/**
 * Scope, closures, and what `this` is bound to in each call form.
 *
 * Run: node examples/javascript/language/closures-and-this.mjs
 */

// --- Block scope and the temporal dead zone -----------------------------------

function scoping() {
  // `var` is function-scoped and hoisted, initialised to undefined:
  console.log("  var before its line ....", typeof varName === "undefined" ? "undefined" : varName);
  var varName = "declared later";

  // `let`/`const` are block-scoped and hoisted into a *temporal dead zone*:
  // touching them before the declaration throws instead of quietly giving undefined.
  try {
    console.log(letName);
  } catch (error) {
    console.log("  let before its line ....", error.constructor.name);
  }
  let letName = "block scoped";

  if (true) {
    var leaks = "var ignores the block";
    let contained = "let does not";
    console.log("  inside the block .......", contained);
  }
  console.log("  after the block ........", leaks, "/", typeof contained);
  return letName;
}

console.log("scoping:");
scoping();

// --- Closures: a function remembers where it was created, not where it runs ----

function makeCounter(start = 0) {
  let count = start; // not reachable from outside except through the returned functions
  return {
    increment: () => ++count,
    get value() {
      return count;
    },
  };
}

const counterA = makeCounter();
const counterB = makeCounter(100);
counterA.increment();
counterA.increment();
counterB.increment();
console.log("\nclosures:");
console.log("  independent counters ....", counterA.value, counterB.value);

// The classic loop-capture bug: `var` has one binding shared by every iteration,
// `let` creates a fresh binding per iteration.
const withVar = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);

const withLet = [];
for (let j = 0; j < 3; j++) withLet.push(() => j);

console.log("  var captured ............", withVar.map((f) => f()).join(", "));
console.log("  let captured ............", withLet.map((f) => f()).join(", "));

// --- `this` depends entirely on *how* a function is called ---------------------

const user = {
  name: "ada",

  // Method call: `this` is the object left of the dot.
  greetMethod() {
    return `method: ${this?.name}`;
  },

  // Arrow function as a property: `this` is captured from the *enclosing scope*
  // at definition time, which here is the module - not `user`.
  greetArrow: () => `arrow: ${this?.name}`,

  // The pattern that matters: an arrow *inside* a method inherits the method's
  // `this`, which is why callbacks written as arrows just work.
  greetDelayed() {
    return [1].map(() => `nested arrow: ${this.name}`)[0];
  },
};

console.log("\nthis:");
console.log(" ", user.greetMethod());
console.log(" ", user.greetArrow(), "<- no object, module scope `this` is undefined in ESM");
console.log(" ", user.greetDelayed());

// Detach a method from its object and `this` is lost:
const detached = user.greetMethod;
console.log(" ", detached(), "<- called with no receiver");

// Three ways to put it back:
console.log(" ", detached.call(user), "<- .call(thisArg, ...args)");
console.log(" ", detached.apply(user, []), "<- .apply(thisArg, argsArray)");
console.log(" ", detached.bind(user)(), "<- .bind returns a permanently bound copy");

// --- Why this bites in practice ------------------------------------------------

class Timer {
  #ticks = 0;

  // A field holding an arrow function is bound to the instance forever, so it
  // survives being passed as a bare callback.
  tickBound = () => ++this.#ticks;

  // A normal method does not.
  tickUnbound() {
    return ++this.#ticks;
  }
}

const timer = new Timer();
const callbacks = [timer.tickBound, timer.tickUnbound];

for (const callback of callbacks) {
  try {
    console.log("  callback result .........", callback());
  } catch (error) {
    console.log("  callback result .........", `${error.constructor.name}: unbound method`);
  }
}
