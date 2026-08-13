/**
 * Getters, setters, and the static side of a class.
 *
 * An accessor looks like a property at the call site but runs code. That is
 * exactly what makes it useful (derived values, validation on write) and
 * exactly what makes it dangerous (a caller cannot tell it is paying for work).
 */

// --- A getter for derived state, a setter for validation -----------------------

class Cart {
  readonly #lines: { readonly price: number; readonly quantity: number }[] = [];
  #discount = 0;

  add(price: number, quantity = 1): void {
    this.#lines.push({ price, quantity });
  }

  // Derived, cheap, and always consistent with the lines. Storing a `total`
  // field instead would mean keeping two things in sync forever.
  get subtotal(): number {
    return this.#lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  }

  get total(): number {
    return Math.round(this.subtotal * (1 - this.#discount));
  }

  // Getter and setter may have *different* types. The getter always returns a
  // normalised number; the setter accepts the shapes callers actually have.
  get discount(): number {
    return this.#discount;
  }

  set discount(value: number | `${number}%`) {
    const fraction = typeof value === "number" ? value : Number(value.slice(0, -1)) / 100;
    if (!(fraction >= 0 && fraction <= 1)) throw new RangeError(`bad discount: ${value}`);
    this.#discount = fraction;
  }
}

const cart = new Cart();
cart.add(1000, 2);
cart.add(500);
cart.discount = "10%"; // setter accepts a percentage string
console.log(cart.subtotal, cart.discount, cart.total); // 2500 0.1 2250

// --- Getter-only vs `readonly`: the same promise, different mechanics ----------

class Session {
  // `readonly` field: one value, fixed at construction, no call cost.
  readonly startedAt: number;

  constructor(startedAt: number) {
    this.startedAt = startedAt;
  }

  // Getter with no setter: recomputed on every read, and impossible to assign.
  get ageMs(): number {
    return Date.now() - this.startedAt;
  }
}

const session = new Session(Date.now() - 1000);
console.log(session.ageMs >= 1000); // true
// session.ageMs = 0;               // ❌ no setter: cannot assign to 'ageMs'

// Rule of thumb: `readonly` when the value never changes, a getter when it is
// derived from something that does. Never a getter for work a caller would want
// to know about - anything async, anything that hits the network, anything
// that can throw for a reason the caller could handle. Those are methods:
// `await session.refresh()` is honest, `session.fresh` is a trap.

// --- `static` state and `static {}` blocks -------------------------------------

// A static block runs once, when the class is defined, and can see the class's
// private statics. It is the place for setup too complex for an initializer.
class FeatureFlags {
  static #defaults: ReadonlyMap<string, boolean>;
  static #names: readonly string[];

  static {
    const entries: readonly (readonly [string, boolean])[] = [
      ["new-checkout", false],
      ["dark-mode", true],
    ];
    FeatureFlags.#defaults = new Map(entries);
    FeatureFlags.#names = entries.map(([name]) => name);
  }

  // A static accessor works exactly like an instance one, on the class object.
  // (A `static readonly` field cannot be assigned from a static block - the
  // compiler only exempts `readonly` *instance* fields, and only inside the
  // constructor - so a private static plus a getter is the way to expose one.)
  static get names(): readonly string[] {
    return FeatureFlags.#names;
  }

  static get count(): number {
    return FeatureFlags.#defaults.size;
  }

  static isOn(name: string): boolean {
    return FeatureFlags.#defaults.get(name) ?? false;
  }
}

console.log(FeatureFlags.count, FeatureFlags.names.join(", ")); // 2 new-checkout, dark-mode
console.log(FeatureFlags.isOn("dark-mode"), FeatureFlags.isOn("nope")); // true false

// --- Caching inside a getter, when the computation is genuinely expensive ------

class Document {
  #wordCount: number | undefined;

  constructor(private readonly text: string) {}

  // Memoised: the first read pays, later reads do not. This is only safe
  // because `text` is `readonly` - a cache over mutable state is a bug waiting
  // for its second reader.
  get wordCount(): number {
    return (this.#wordCount ??= this.text.split(/\s+/u).filter(Boolean).length);
  }
}

const doc = new Document("the quick brown fox");
console.log(doc.wordCount, doc.wordCount); // 4 4 (computed once)

// --- `accessor` fields: a getter/setter pair written as one line ---------------

// `accessor x = 1` declares a private backing field plus a get/set pair. On its
// own it buys little; its reason to exist is that a decorator can wrap the pair.
class Counter {
  accessor value = 0;

  increment(): number {
    return (this.value += 1);
  }
}

const counter = new Counter();
counter.increment();
console.log(counter.value, Object.hasOwn(counter, "value")); // 1 false - it lives on the prototype

export { Cart, Session, FeatureFlags, Document, Counter };
