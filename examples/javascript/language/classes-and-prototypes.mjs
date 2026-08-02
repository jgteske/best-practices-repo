/**
 * Prototypes, what `class` desugars to, and the object features worth using.
 *
 * Run: node examples/javascript/language/classes-and-prototypes.mjs
 */

// --- Every object has a prototype; lookup walks the chain ----------------------

const base = {
  describe() {
    return `a ${this.kind}`;
  },
};

const derived = Object.create(base); // derived.[[Prototype]] === base
derived.kind = "widget";

console.log("prototype chain:");
console.log("  derived.describe() ..............", derived.describe());
console.log("  own property? kind ..............", Object.hasOwn(derived, "kind"));
console.log("  own property? describe ..........", Object.hasOwn(derived, "describe"), "<- inherited");
console.log("  chain ...........................", [
  "derived",
  Object.getPrototypeOf(derived) === base ? "base" : "?",
  Object.getPrototypeOf(base) === Object.prototype ? "Object.prototype" : "?",
  String(Object.getPrototypeOf(Object.prototype)), // null: the end of every chain
].join(" -> "));

// --- `class` is that same machinery with better syntax -------------------------

class Shape {
  // A public field: assigned per instance, in declaration order, before the
  // constructor body runs.
  createdAt = 0;

  // A private field: genuinely inaccessible outside the class body. Not a
  // convention like `_name` - reading `shape.#area` elsewhere is a syntax error.
  #area;

  static registry = new Set();

  constructor(area) {
    this.#area = area;
    Shape.registry.add(new.target.name);
  }

  // A getter looks like a property at the call site but runs code.
  get area() {
    return this.#area;
  }

  set area(next) {
    if (!Number.isFinite(next) || next < 0) throw new RangeError(`bad area: ${next}`);
    this.#area = next;
  }

  // Methods live on Shape.prototype - one copy shared by every instance.
  toString() {
    return `${this.constructor.name}(${this.area})`;
  }

  // #private methods work too, and static blocks run once at class definition.
  static #describe(shape) {
    return `${shape} registered`;
  }

  static announce(shape) {
    return Shape.#describe(shape);
  }
}

class Square extends Shape {
  constructor(side) {
    super(side * side); // must run before `this` is touched
    this.side = side;
  }

  // Overriding still walks the chain: super.toString() finds Shape.prototype's.
  toString() {
    return `${super.toString()} side=${this.side}`;
  }
}

const square = new Square(3);

console.log("\nclasses:");
console.log("  toString ........................", String(square));
console.log("  getter ..........................", square.area);
console.log("  methods live on the prototype ...", Object.hasOwn(square, "toString") === false);
console.log("  instanceof both .................", square instanceof Square, square instanceof Shape);
console.log("  static registry .................", [...Shape.registry].join(", "));
console.log("  static private method ...........", Shape.announce(square));

try {
  square.area = -1;
} catch (error) {
  console.log("  setter validation ...............", `${error.name}: ${error.message}`);
}

// #private really is private:
console.log("  #area is not enumerable .........", Object.keys(square).join(", "));

// --- Freezing, and the fact that it is shallow ---------------------------------

const config = Object.freeze({ retries: 3, nested: { timeout: 1000 } });
try {
  config.retries = 99; // silently ignored in sloppy mode, throws in a module (always strict)
} catch (error) {
  console.log("\nfreeze:");
  console.log("  top level write .................", `${error.constructor.name} (modules are strict mode)`);
}
config.nested.timeout = 5000; // NOT frozen: freeze is one level deep
console.log("  nested write went through .......", config.nested.timeout);

// --- Optional chaining and nullish coalescing ----------------------------------

const response = { data: { items: null } };

console.log("\nsafe access:");
console.log("  ?. short-circuits ...............", response.missing?.deeply?.nested);
console.log("  ?.[] and ?.() too ...............", response.data?.items?.[0], response.missing?.());
console.log("  ?? only replaces null/undefined .", response.data.items ?? "fallback");
console.log("  count ?? 0 keeps a real zero ....", 0 ?? 99);

// A guard clause reads better than a chain three levels deep - `?.` is for
// "legitimately optional", not for hiding a shape you should have validated.
