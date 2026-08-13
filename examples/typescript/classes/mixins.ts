/**
 * Mixins: a function that takes a class and returns a subclass of it.
 *
 * `extends` gives one base class. A mixin gives as many as you like, by making
 * the base a *parameter* - `withTimestamps(User)` returns a new class that
 * extends `User` and adds a slice of behaviour. Compose them by nesting.
 */

// --- The constructor type every mixin needs ---------------------------------------

// This is the one place `any` is the right answer, and it is worth knowing why.
// The mixin must accept a base class with *any* constructor signature and pass
// its arguments straight through. `unknown[]` or `never[]` would reject every
// real class: parameters are checked contravariantly, so a base declared as
// `constructor(name: string)` is not assignable to `new (...args: unknown[])`.
// `any[]` is what makes the pass-through possible.
type Ctor<Instance = object> = new (...args: any[]) => Instance;

// The abstract form, for mixing into a base that is itself abstract.
type AnyCtor<Instance = object> = abstract new (...args: any[]) => Instance;

// --- A mixin with no requirements on its base ---------------------------------------

// Declaring the contribution as an interface is what keeps the result readable:
// callers see `Timestamped`, not an anonymous class expression.
interface Timestamped {
  readonly createdAt: Date;
  touch(): void;
  ageMs(): number;
}

function withTimestamps<Base extends Ctor>(BaseClass: Base) {
  // The returned class is an expression, usually anonymous. It may declare
  // fields, methods, accessors and its own constructor like any other class.
  return class Timestamps extends BaseClass implements Timestamped {
    readonly createdAt = new Date();
    #updatedAt = new Date();

    // `...args: any[]` again: the mixin does not know what the base needs.
    constructor(...args: any[]) {
      super(...args);
    }

    touch(): void {
      this.#updatedAt = new Date();
    }

    ageMs(): number {
      return this.#updatedAt.getTime() - this.createdAt.getTime();
    }
  };
}

// --- A mixin that *requires* something of its base ------------------------------------

// Constrain the parameter and the mixin can use the base's members. This is how
// a mixin declares its dependencies - and a class that lacks them fails at the
// application site, not somewhere inside.
interface HasId {
  readonly id: string;
}

function withStorage<Base extends Ctor<HasId>>(BaseClass: Base) {
  return class Storage extends BaseClass {
    static readonly storageKey = "entities"; // statics come along too

    save(store: Map<string, unknown>): void {
      // `this.id` is available because of the `Ctor<HasId>` constraint.
      store.set(`${Storage.storageKey}:${this.id}`, { ...this });
    }
  };
}

// --- Applying and composing --------------------------------------------------------

class User implements HasId {
  constructor(
    readonly id: string,
    readonly email: string,
  ) {}
}

// Read it inside-out: User, plus timestamps, plus storage.
const StoredUser = withStorage(withTimestamps(User));
type StoredUser = InstanceType<typeof StoredUser>;

const user: StoredUser = new StoredUser("u_1", "ada@example.com");
user.touch();

const store = new Map<string, unknown>();
user.save(store);
console.log(user.id, user.email, user.createdAt instanceof Date, user.ageMs() >= 0);
// u_1 ada@example.com true true
console.log([...store.keys()]); // [ 'entities:u_1' ]

// The composed type is the intersection of everything applied, so a function can
// ask for exactly the slice it uses - not the concrete class:
function report(entity: HasId & Timestamped): string {
  return `${entity.id} (${entity.ageMs()}ms)`;
}

console.log(report(user)); // u_1 (0ms)

// --- What mixins cost -----------------------------------------------------------------

// ⚠️ `instanceof` only works against a class you have a name for. Each *call* of
// a mixin creates a new class, so this is false:
console.log(new (withTimestamps(User))("u_2", "x") instanceof StoredUser); // false
//
// Hold the composed class in a `const` (as `StoredUser` above) and use that
// everywhere, or check for the capability instead of the class:
console.log("touch" in user); // true

// ⚠️ Deep mixin stacks have the same problem as deep inheritance, plus worse
// error messages: a failure inside `withStorage(withTimestamps(withAudit(User)))`
// reports an anonymous class. Two or three is comfortable; past that, a
// collaborator object passed to the constructor is easier to read and to test.

// --- Mixing into an abstract base --------------------------------------------------

abstract class Job {
  abstract run(): string;
}

// `AnyCtor` accepts the abstract class; the result is still abstract, so it can
// only be extended, not constructed.
function withRetries<Base extends AnyCtor<{ run(): string }>>(BaseClass: Base) {
  abstract class Retrying extends BaseClass {
    retries = 2;

    runWithRetries(): string {
      let lastError: unknown;
      for (let attempt = 0; attempt <= this.retries; attempt += 1) {
        try {
          return this.run();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }
  }

  return Retrying;
}

class FlakyJob extends withRetries(Job) {
  #attempts = 0;

  override run(): string {
    this.#attempts += 1;
    if (this.#attempts < 2) throw new Error("flaky");
    return `ok after ${this.#attempts}`;
  }
}

console.log(new FlakyJob().runWithRetries()); // ok after 2

// --- The alternative worth considering first ------------------------------------------

// Everything above is composition expressed through the prototype chain. The
// same behaviour as a plain function is shorter, has no `any` in it, and needs
// no `instanceof` caveats:
function timestampsFor(): Timestamped {
  const createdAt = new Date();
  let updatedAt = createdAt;
  return {
    createdAt,
    touch: () => void (updatedAt = new Date()),
    ageMs: () => updatedAt.getTime() - createdAt.getTime(),
  };
}

const plain = { id: "u_3", ...timestampsFor() };
console.log(report(plain)); // u_3 (0ms)

// Reach for a mixin when the behaviour genuinely needs to be *inherited* -
// because a framework requires a class, because `super` calls matter, or
// because the base is one you do not own.

export { withTimestamps, withStorage, withRetries, User, StoredUser, Job, FlakyJob, report };
export type { Ctor, AnyCtor, Timestamped, HasId };
