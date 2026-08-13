/**
 * `extends`, `super`, and `override`.
 *
 * Inheritance is the tightest coupling the language offers: the subclass
 * depends on the base class's *implementation*, not just its shape. Everything
 * here is about keeping that coupling honest - and about the two traps
 * (silently orphaned overrides, and a base constructor calling a method the
 * subclass has replaced) that the compiler can only help with if you let it.
 */

// --- `super()` before `this`, `super.method()` after ---------------------------

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string, options?: { cause: unknown }) {
    // `super(...)` must run before `this` is touched - it is what creates the
    // instance in a derived class. `cause` (ES2022) keeps the original error
    // instead of flattening it into a string.
    super(message, options);
    this.status = status;

    // `Error` sets `name` to "Error"; overwriting it is what makes the stack's
    // first line read "HttpError: not found".
    this.name = "HttpError";
  }

  override toString(): string {
    // `super.toString()` continues the lookup at Error.prototype rather than
    // recursing into this method.
    return `${super.toString()} (${this.status})`;
  }
}

const notFound = new HttpError(404, "not found", { cause: new TypeError("bad id") });
console.log(String(notFound)); // HttpError: not found (404)
console.log(notFound instanceof HttpError, notFound instanceof Error); // true true
console.log(notFound.cause instanceof TypeError); // true

// Subclassing `Error` is one of the places a class beats a factory outright:
// `instanceof` and the stack trace both come from the prototype chain.
//
// Two caveats, both about *older* compile targets: with `target: ES5` the
// prototype chain is broken by TypeScript's emit and needs
// `Object.setPrototypeOf(this, new.target.prototype)` in the constructor. This
// repo targets ES2022, where `extends Error` simply works.

// --- `override` is not decoration ----------------------------------------------

class Repository {
  find(id: string): string | undefined {
    return id === "1" ? "row" : undefined;
  }

  // Renaming this to `findAll` would silently orphan every subclass override -
  // they would keep compiling as brand-new methods that nobody calls.
  list(): readonly string[] {
    return ["row"];
  }
}

class LoggingRepository extends Repository {
  #reads = 0;

  // With `noImplicitOverride` on (this repo's tsconfig), the keyword is
  // mandatory - and it is checked: if `list` disappears from the base, this
  // line fails with "This member cannot have an 'override' modifier because it
  // is not declared in the base class". That error is the entire point.
  override list(): readonly string[] {
    this.#reads += 1;
    return super.list();
  }

  override find(id: string): string | undefined {
    this.#reads += 1;
    return super.find(id);
  }

  get reads(): number {
    return this.#reads;
  }
}

const repo = new LoggingRepository();
repo.list();
repo.find("1");
console.log(repo.reads); // 2

// --- What an override may and may not change -----------------------------------

class Base {
  protected helper(): string {
    return "base";
  }

  greet(name: string): string {
    return `hello ${name}`;
  }
}

class Derived extends Base {
  // ✅ widening visibility (protected -> public) is allowed
  override helper(): string {
    return "derived";
  }

  // ✅ a narrower return type is allowed - callers of the base signature still
  //    get something valid
  override greet(name: string): `hello ${string}` {
    return `hello ${name.toUpperCase()}`;
  }

  // ❌ narrowing visibility is not:
  //    private greet() {}   // 'greet' is public in 'Base' but private in 'Derived'
}

console.log(new Derived().helper(), new Derived().greet("ada")); // derived hello ADA

// Method *parameters* are checked bivariantly, which is unsound and occasionally
// bites. This compiles, and breaks when a caller holding a `Base` passes a
// string that is not a member of the union:
//
//   class Loose extends Base {
//     override greet(name: "ada" | "alan"): string { return `hello ${name}`; }
//   }
//
// Declaring the method as a property (`greet: (name: string) => string`) makes
// the check strict - and is worth doing on any base class meant for extension.

// --- The trap: a base constructor calling an overridable method ----------------

// Field initializers in a subclass run *after* `super()` returns. So a method
// called from the base constructor sees the subclass's fields as `undefined`.
class Renderer {
  constructor() {
    // ❌ this calls the subclass's override, before the subclass exists
    console.log(this.render());
  }

  render(): string {
    return "<base />";
  }
}

class ButtonRenderer extends Renderer {
  label = "OK"; // initialized after super() has already called render()

  override render(): string {
    return `<button>${this.label}</button>`;
  }
}

// Constructing this logs "<button>undefined</button>", and the type says
// `string`. With a `#private` field it is worse still: reading `this.#label`
// before its initializer has run throws a TypeError outright.
//
//   new ButtonRenderer();
//
// The fix is never to call an overridable method from a constructor: expose an
// explicit `init()`/`mount()` the caller invokes, or a static factory that
// constructs and then renders.
class SafeRenderer {
  static create(): SafeRenderer {
    const instance = new SafeRenderer();
    console.log(instance.render()); // now every field exists
    return instance;
  }

  render(): string {
    return "<base />";
  }
}

SafeRenderer.create(); // <base />

// --- Prefer composition, and keep the chain shallow ----------------------------

// Two levels is usually the honest maximum. Past that, "which class does this
// method actually come from" stops being answerable without reading all of them
// - and the answer is usually a collaborator passed in, not a third `extends`.
// See ./factory-functions for the version of this class hierarchy that is just
// a function taking a dependency.

export { HttpError, Repository, LoggingRepository, Base, Derived };
export { Renderer, ButtonRenderer, SafeRenderer };
