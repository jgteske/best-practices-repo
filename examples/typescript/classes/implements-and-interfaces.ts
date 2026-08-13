/**
 * Classes, interfaces, and the two types every class declaration creates.
 *
 * `class Foo {}` introduces a *value* (the constructor function) and a *type*
 * (the shape of an instance). `implements` connects a class to a contract
 * without inheriting anything from it - it is a compile-time assertion and
 * nothing else. Nothing is emitted, no method arrives for free.
 */

// --- The contract ---------------------------------------------------------------

// An `interface` is the usual choice for a contract a class implements: it is
// open to declaration merging, and its errors point at the member that is
// wrong. A `type` alias works identically for this purpose - use whichever the
// surrounding code uses, and prefer `interface` when a library consumer might
// need to extend it.
interface Cache<Value> {
  get(key: string): Value | undefined;
  set(key: string, value: Value): void;
  readonly size: number;
}

interface Disposable {
  dispose(): void;
}

// One class, several contracts. Each is checked independently.
class MemoryCache<Value> implements Cache<Value>, Disposable {
  readonly #entries = new Map<string, Value>();

  get(key: string): Value | undefined {
    return this.#entries.get(key);
  }

  set(key: string, value: Value): void {
    this.#entries.set(key, value);
  }

  // An interface's `readonly` property is satisfied by a getter, a `readonly`
  // field, or even a plain mutable field - `readonly` constrains the *caller*.
  get size(): number {
    return this.#entries.size;
  }

  dispose(): void {
    this.#entries.clear();
  }
}

const cache: Cache<number> = new MemoryCache<number>();
cache.set("a", 1);
console.log(cache.get("a"), cache.size); // 1 1

// --- `implements` checks; it does not give ---------------------------------------

// Remove `set` from MemoryCache and the error lands on the class declaration:
//
//   Class 'MemoryCache<Value>' incorrectly implements interface 'Cache<Value>'.
//     Property 'set' is missing.
//
// That is the whole value of the clause. Without it the class still *is* a
// `Cache` structurally, but the mistake is only reported at whichever call site
// happens to need the missing member first.

// ❌ `implements` never brings an implementation with it. There is no such thing
//    as an interface with a default method - if two classes need the same code,
//    that code goes in a shared function, a base class, or a mixin.

// --- Structural, until a class has private state ---------------------------------

// TypeScript is structural: any object of the right shape satisfies the type,
// which is what makes test doubles trivial.
const stubCache: Cache<number> = {
  get: () => 42,
  set: () => {},
  size: 1,
};

console.log(stubCache.get("anything")); // 42

// But a class *type* with `private`/`#private` members is effectively nominal -
// only instances of that exact class satisfy it, because no object literal can
// produce the private slot:
class Token {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  toString(): string {
    return `${this.#value.slice(0, 3)}...`;
  }
}

// const fake: Token = { toString: () => "abc..." };
// ❌ Property '#value' is missing in type '{ toString: () => string; }'
//
// That is a feature when you want a value nobody can forge (see the branded
// types in ./type-safe-validation for the version without a class), and a
// nuisance when you wanted a mock. Contracts meant to be doubled should be
// interfaces, not classes.
console.log(String(new Token("secret-key"))); // sec...

// --- What `implements` does *not* check: the static side --------------------------

// An interface constrains instances. Nothing in `implements` says anything
// about the constructor, or about static members:
interface Serializer<T> {
  serialize(value: T): string;
}

// The static side is described by a separate interface, applied to the class
// object itself - `satisfies` is the cleanest way to do that, because it checks
// without widening the class's own type.
interface SerializerStatic<T> {
  readonly format: string;
  parse(text: string): T;
}

class JsonSerializer implements Serializer<unknown> {
  static readonly format = "json";

  static parse(text: string): unknown {
    return JSON.parse(text);
  }

  serialize(value: unknown): string {
    return JSON.stringify(value);
  }
}

// This line is the check. Rename `parse` and it fails here, at the class, not
// at some distant caller.
const _jsonStatic = JsonSerializer satisfies SerializerStatic<unknown>;
console.log(_jsonStatic.format, JsonSerializer.parse('{"a":1}')); // json { a: 1 }

// --- A class's instance type vs its static type -----------------------------------

// `JsonSerializer` (the type) is one instance. `typeof JsonSerializer` is the
// class object: its statics *and* its construct signature.
type Instance = JsonSerializer; // { serialize(value: unknown): string }
type Static = typeof JsonSerializer; // { new (): JsonSerializer; format: string; parse(...): unknown }

const serializer: Instance = new JsonSerializer();
const SerializerClass: Static = JsonSerializer;
console.log(serializer.serialize([1]), new SerializerClass().serialize(true)); // [1] true

// --- Extending an interface *from* a class ----------------------------------------

// `interface X extends SomeClass` copies the class's member types (including
// private ones, which is why only subclasses can then implement it). It is the
// tidy way to say "the same shape, minus the implementation":
class Widget {
  render(): string {
    return "<div />";
  }
}

interface Rendered extends Widget {
  readonly html: string;
}

const rendered: Rendered = Object.assign(new Widget(), { html: "<div />" });
console.log(rendered.render(), rendered.html); // <div /> <div />

export { MemoryCache, Token, JsonSerializer, Widget };
export type { Cache, Disposable, Serializer, SerializerStatic, Instance, Static, Rendered };
