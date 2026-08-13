/**
 * Fields, visibility, and constructors.
 *
 * A class body declares three things that are easy to confuse: fields (one per
 * instance), statics (one per class), and parameter properties (a field and a
 * constructor assignment, written once). On top of that sit two completely
 * different privacy mechanisms - `private`, which only the compiler enforces,
 * and `#field`, which the language enforces at runtime.
 */

// --- Everything a field declaration can say ------------------------------------

class Account {
  // A public field with an initializer: assigned per instance, in declaration
  // order, before the constructor body runs.
  readonly createdAt = new Date();

  // `readonly` blocks writes from callers *and* from methods; the constructor
  // may still assign it. Compile-time only - nothing stops plain JavaScript.
  readonly id: string;

  // `#balance` is a JavaScript private field: unreachable outside this class
  // body at runtime, and invisible to Object.keys and JSON.stringify.
  #balance: number;

  // `private` is a *compiler* rule. At runtime this is an ordinary, visible
  // property - a cast or a JSON round-trip reaches it.
  private readonly auditLog: string[] = [];

  // `protected`: visible to subclasses, invisible to callers.
  protected currency: string;

  // On the class, not the instance. `static readonly` is the closest thing a
  // class has to a constant.
  static readonly MIN_BALANCE = 0;

  constructor(id: string, balance: number, currency = "EUR") {
    this.id = id;
    this.#balance = balance;
    this.currency = currency;
  }

  get balance(): number {
    return this.#balance;
  }

  withdraw(amount: number): void {
    const next = this.#balance - amount;
    if (next < Account.MIN_BALANCE) {
      throw new RangeError(`${this.id}: balance would fall below ${Account.MIN_BALANCE}`);
    }
    this.#balance = next;
    this.auditLog.push(`-${amount} ${this.currency}`);
  }

  history(): readonly string[] {
    return this.auditLog;
  }
}

const account = new Account("acc_1", 100);
account.withdraw(30);
console.log(account.balance, account.history()); // 70 [ '-30 EUR' ]

// account.#balance;                              // ❌ not accessible outside the class body
// account.auditLog;                              // ❌ 'auditLog' is private
// account.createdAt = new Date();                // ❌ read-only property

// The difference that matters: `private` is advice to the compiler, `#` is a
// runtime boundary. Only one of these two lines actually gets the data.
console.log((account as unknown as { auditLog: string[] }).auditLog); // [ '-30 EUR' ]
console.log(Object.keys(account).join(", ")); // createdAt, id, auditLog, currency - no #balance

// --- Parameter properties: the same class, minus the ceremony ------------------

// `readonly amount: number` in the parameter list declares the field, types it,
// and assigns it. Use them for plain data holders; for anything that validates
// or transforms its input, an explicit constructor body is clearer.
class Money {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  plus(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new TypeError(`cannot add ${other.currency} to ${this.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  toString(): string {
    return `${(this.amount / 100).toFixed(2)} ${this.currency}`;
  }
}

console.log(String(new Money(1050, "EUR").plus(new Money(250, "EUR")))); // 13.00 EUR

// --- The ordering trap that parameter properties create ------------------------

// Field initializers run when the instance is created; parameter properties are
// assigned in the constructor *body*, which is later. So a field initializer
// cannot see a parameter property. Read one directly and the compiler stops you:
//
//   class Widget {
//     label = `#${this.id}`;             // ❌ TS2729: 'id' is used before its initialization
//     constructor(public id: string) {}
//   }
//
// Read it through a method and nothing stops you - `label` is "#undefined":
//
//   class Widget {
//     label = this.makeLabel();          // ✅ compiles, ❌ wrong at runtime
//     constructor(public id: string) {}
//     makeLabel() { return `#${this.id}`; }
//   }
//
// The fix is to do the work in the constructor body, after the assignment.
class Widget {
  readonly label: string;

  constructor(readonly id: string) {
    this.label = `#${id}`;
  }
}

console.log(new Widget("abc").label); // #abc

// --- Definite assignment: `!` for state a lifecycle method fills in ------------

// `!` says "I promise this is assigned before anything reads it". It switches
// off a real check, so it needs a real reason - here, the resource genuinely
// cannot exist until `open()` runs.
class FileHandle {
  private handle!: { write: (chunk: string) => void; close: () => void };
  private open = false;

  start(): void {
    const chunks: string[] = [];
    this.handle = {
      write: (chunk) => void chunks.push(chunk),
      close: () => console.log(`wrote ${chunks.length} chunk(s)`),
    };
    this.open = true;
  }

  write(chunk: string): void {
    if (!this.open) throw new Error("call start() first");
    this.handle.write(chunk);
  }

  stop(): void {
    if (this.open) this.handle.close();
    this.open = false;
  }
}

const file = new FileHandle();
file.start();
file.write("hello");
file.stop(); // wrote 1 chunk(s)

// A union type is usually the better answer, because it makes the two states
// visible instead of asserting one of them away - see
// ./modeling-with-unions for the full version of that argument.

// --- `declare` re-types an inherited field without redeclaring it --------------

type Animal = { readonly name: string };
type Dog = Animal & { readonly bark: () => string };

class Shelter {
  resident: Animal = { name: "unknown" };
}

// ❌ Without `declare`, this emits a *new* field initialized to undefined, which
//    overwrites whatever the base constructor assigned:
//
//    class DogShelter extends Shelter { resident: Dog; }   // resident === undefined
//
// ✅ `declare` says "this field already exists; I am only narrowing its type".
//    Nothing is emitted, so the base class's value survives.
class DogShelter extends Shelter {
  declare resident: Dog;

  constructor(dog: Dog) {
    super();
    this.resident = dog;
  }

  speak(): string {
    return this.resident.bark();
  }
}

console.log(new DogShelter({ name: "Rex", bark: () => "woof" }).speak()); // woof

// --- Constructor overloads, and the named constructors that beat them -----------

// A class gets exactly one constructor implementation. Overload signatures let
// it accept two shapes - but every caller still writes `new Range(...)`, and the
// implementation has to work out which call it got.
class Range {
  readonly start: number;
  readonly end: number;

  constructor(length: number);
  constructor(start: number, end: number);
  constructor(a: number, b?: number) {
    this.start = b === undefined ? 0 : a;
    this.end = b ?? a;
  }

  get length(): number {
    return this.end - this.start;
  }
}

console.log(new Range(5).length, new Range(2, 7).length); // 5 5

// Static factory methods are the version that reads better at the call site:
// each entry point gets a name, its own signature, and its own validation. A
// `private constructor` funnels every path through one place.
class Duration {
  private constructor(readonly ms: number) {}

  static fromMilliseconds(ms: number): Duration {
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`bad duration: ${ms}`);
    return new Duration(ms);
  }

  static fromSeconds(seconds: number): Duration {
    return Duration.fromMilliseconds(seconds * 1000);
  }

  static between(from: Date, to: Date): Duration {
    return Duration.fromMilliseconds(to.getTime() - from.getTime());
  }

  toString(): string {
    return `${this.ms}ms`;
  }
}

console.log(String(Duration.fromSeconds(1.5))); // 1500ms
// new Duration(5);                              // ❌ constructor is private

export { Account, Money, Widget, FileHandle, Shelter, DogShelter, Range, Duration };
export type { Animal, Dog };
