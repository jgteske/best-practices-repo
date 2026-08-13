/**
 * What a class actually does at runtime: the order initializers run in, how
 * `this` is lost, what `super` looks up, and the ES2022 features (`#private`,
 * static blocks, brand checks) that have no equivalent in an object literal.
 *
 * Everything here is plain JavaScript - the TypeScript guide's Classes section
 * covers the parts that only exist at compile time.
 *
 * Run: node examples/javascript/language/class-runtime-semantics.mjs
 */

// --- 1. The order everything runs in -------------------------------------------

const steps = [];
const step = (what) => {
  steps.push(what);
  return what;
};

class Base {
  baseField = step("base field initializer");

  constructor(tag = step("base parameter default")) {
    this.tag = tag;
    step("base constructor body");
  }
}

class Derived extends Base {
  derivedField = step("derived field initializer");

  constructor() {
    step("derived constructor body, before super()");
    super();
    step("derived constructor body, after super()");
  }
}

new Derived();

console.log("construction order:");
steps.forEach((what, index) => console.log(`  ${index + 1}. ${what}`));

// Two things surprise people here. A *base* class initializes its fields before
// its own parameter defaults are evaluated, because field initialization is part
// of creating the object, which happens before the constructor body is entered.
// A *derived* class initializes its fields only once `super()` returns - which
// is why a base constructor that calls an overridden method sees the subclass's
// fields as undefined.

// --- 2. `this` is decided by the call, not the definition -----------------------

class Stopwatch {
  #ticks = 0;

  tick() {
    return (this.#ticks += 1);
  }

  tickBound = () => (this.#ticks += 1);

  get ticks() {
    return this.#ticks;
  }
}

const stopwatch = new Stopwatch();
stopwatch.tick(); // method call: `this` is stopwatch

const detached = stopwatch.tick;
let detachedError = "no error";
try {
  detached();
} catch (error) {
  // `this` is undefined, not the instance - module code is always strict mode.
  detachedError = `${error.constructor.name}: ${error.message}`;
}

const bound = stopwatch.tick.bind(stopwatch);
bound();
stopwatch.tickBound();
[1].forEach(() => stopwatch.tick());

console.log("\nthis binding:");
console.log("  detached method .................", detachedError);
console.log("  .bind / arrow field / wrapper ...", stopwatch.ticks, "ticks recorded");
console.log("  arrow field is per instance .....", Object.hasOwn(stopwatch, "tickBound"));
console.log("  method is on the prototype ......", Object.hasOwn(stopwatch, "tick") === false);

// --- 3. `super` continues the lookup, it does not restart it --------------------

class Layer {
  describe() {
    return "layer";
  }

  static create() {
    return new this(); // `this` in a static method is the class it was called on
  }
}

class Overlay extends Layer {
  describe() {
    return `${super.describe()} > overlay`;
  }
}

console.log("\nsuper:");
console.log("  super.describe() ................", new Overlay().describe());
console.log("  static `this` is the subclass ...", Overlay.create().constructor.name);

// --- 4. `new.target`: which class was actually constructed ----------------------

class AbstractRepository {
  constructor() {
    if (new.target === AbstractRepository) {
      throw new TypeError("AbstractRepository is abstract; extend it");
    }
    this.kind = new.target.name;
  }
}

class UserRepository extends AbstractRepository {}

let abstractError = "no error";
try {
  new AbstractRepository();
} catch (error) {
  abstractError = `${error.constructor.name}: ${error.message}`;
}

console.log("\nnew.target:");
console.log("  constructing the base ...........", abstractError);
console.log("  constructing a subclass .........", new UserRepository().kind);

// --- 5. `#private` is a real boundary, and doubles as a brand -------------------

class Currency {
  #code;

  constructor(code) {
    this.#code = code;
  }

  // `#code in value` is an ES2022 brand check: true only for objects that were
  // actually constructed by this class. No instanceof, no forgeable marker
  // property, and it works across realms in a way instanceof does not.
  static is(value) {
    return typeof value === "object" && value !== null && #code in value;
  }

  toString() {
    return this.#code;
  }
}

const eur = new Currency("EUR");
const lookalike = { toString: () => "EUR" };

console.log("\n#private:");
console.log("  brand check on the real thing ...", Currency.is(eur));
console.log("  brand check on a lookalike ......", Currency.is(lookalike));
console.log("  invisible to Object.keys ........", JSON.stringify(Object.keys(eur)));
console.log("  invisible to JSON.stringify .....", JSON.stringify(eur));

// --- 6. Static blocks and static private state ----------------------------------

class Config {
  static #values = new Map();
  static #frozen = false;

  // Runs once, when the class is defined. `this` is the class.
  static {
    for (const [key, value] of Object.entries({ retries: 3, timeoutMs: 500 })) {
      this.#values.set(key, value);
    }
    this.#frozen = true;
  }

  static get(key) {
    return this.#values.get(key);
  }

  static get isFrozen() {
    return this.#frozen;
  }
}

console.log("\nstatic:");
console.log("  populated by a static block .....", Config.get("retries"), Config.isFrozen);

// --- 7. Mixins: a function that takes a class and returns a subclass ------------

const withTimestamps = (BaseClass) =>
  class extends BaseClass {
    createdAt = Date.now();

    ageMs() {
      return Date.now() - this.createdAt;
    }
  };

const withJson = (BaseClass) =>
  class extends BaseClass {
    toJSON() {
      // Fields are enumerable own properties; methods are not. So a spread of
      // `this` is exactly "the data", which is usually what you want here.
      return { ...this };
    }
  };

class Note {
  constructor(text) {
    this.text = text;
  }
}

const TimestampedNote = withJson(withTimestamps(Note));
const note = new TimestampedNote("hello");

console.log("\nmixins:");
console.log("  composed prototype chain ........", [
  note.constructor.name || "(anonymous)",
  Object.getPrototypeOf(Object.getPrototypeOf(note)).constructor.name || "(anonymous)",
  Note.name,
].join(" -> "));
console.log("  behaviour from both mixins ......", note.ageMs() >= 0, JSON.stringify(note.toJSON()).includes("hello"));
console.log("  each call is a different class ..", withTimestamps(Note) !== withTimestamps(Note));

// --- 8. Well-known symbols make a class feel built in ---------------------------

class Deck {
  #cards;

  constructor(...cards) {
    this.#cards = cards;
  }

  get [Symbol.toStringTag]() {
    return "Deck";
  }

  *[Symbol.iterator]() {
    yield* this.#cards;
  }

  get size() {
    return this.#cards.length;
  }
}

const deck = new Deck("A", "K", "Q");

console.log("\nsymbols:");
console.log("  Object.prototype.toString .......", Object.prototype.toString.call(deck));
console.log("  spreads and for..of work ........", [...deck].join(""), deck.size);

// --- 9. What ends up on the instance vs the prototype ---------------------------

// Fields are enumerable own properties of the instance; methods, getters and
// symbol-keyed members live on the prototype and are not enumerable - which is
// why JSON.stringify sees the first group and nothing else.
console.log("\nwhere things live:");
console.log("  own properties of a note ........", JSON.stringify(Object.keys(note)));
console.log("  own properties of a deck ........", JSON.stringify(Object.keys(deck)), "(all #private)");
console.log("  Deck.prototype ..................", [
  ...Object.getOwnPropertyNames(Deck.prototype),
  ...Object.getOwnPropertySymbols(Deck.prototype).map(String),
].join(", "));
