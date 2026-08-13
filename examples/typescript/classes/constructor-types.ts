/**
 * Typing the class itself: construct signatures, generic classes, and
 * constructors passed around as values.
 *
 * A class is a value, so it can be a parameter, stored in a record, or returned
 * from a function. What it needs then is a *type* - and the type of a class is
 * not the type of its instances.
 */

// --- Construct signatures --------------------------------------------------------

interface Plugin {
  readonly name: string;
  run(input: string): string;
}

// `new (...) => T` is the type of "something you can call with `new`". This is
// what a parameter should be when a function receives a class rather than an
// instance.
type PluginClass = new (options: { readonly verbose: boolean }) => Plugin;

class UppercasePlugin implements Plugin {
  readonly name = "uppercase";

  constructor(private readonly options: { readonly verbose: boolean }) {}

  run(input: string): string {
    if (this.options.verbose) console.log(`${this.name}: ${input}`);
    return input.toUpperCase();
  }
}

class ReversePlugin implements Plugin {
  readonly name = "reverse";

  constructor(private readonly options: { readonly verbose: boolean }) {}

  run(input: string): string {
    if (this.options.verbose) console.log(`${this.name}: ${input}`);
    return [...input].reverse().join("");
  }
}

// The parameter is the class, not an instance - so the caller decides *what* to
// build and this function decides *when*.
function runAll(classes: readonly PluginClass[], input: string): string {
  return classes.reduce((text, Plugin) => new Plugin({ verbose: false }).run(text), input);
}

console.log(runAll([UppercasePlugin, ReversePlugin], "abc")); // CBA

// --- Deriving types from a class -------------------------------------------------

// Rather than writing the instance type out again, derive it. These stay
// correct when the constructor changes, which hand-written duplicates do not.
type UppercaseInstance = InstanceType<typeof UppercasePlugin>; // UppercasePlugin
type UppercaseArgs = ConstructorParameters<typeof UppercasePlugin>; // [{ readonly verbose: boolean }]

const args: UppercaseArgs = [{ verbose: false }];
const plugin: UppercaseInstance = new UppercasePlugin(...args);
console.log(plugin.name); // uppercase

// The same trick is what lets a generic helper name the thing it built:
function instantiate<Ctor extends new (...args: never[]) => unknown>(
  Class: Ctor,
  ...args: ConstructorParameters<Ctor>
): InstanceType<Ctor> {
  return new Class(...(args as never[])) as InstanceType<Ctor>;
}

console.log(instantiate(ReversePlugin, { verbose: false }).run("abc")); // cba

// --- Generic classes --------------------------------------------------------------

// A type parameter on the class is in scope for every member. It is fixed when
// the instance is created, which is the difference from a generic *method*.
class Box<Value> {
  readonly #items: Value[] = [];

  add(item: Value): this {
    this.#items.push(item);
    return this;
  }

  // A generic *method* introduces its own parameter, resolved per call.
  mapTo<Other>(project: (item: Value) => Other): Box<Other> {
    const next = new Box<Other>();
    for (const item of this.#items) next.add(project(item));
    return next;
  }

  toArray(): readonly Value[] {
    return this.#items;
  }
}

// `Value` is inferred from usage where possible; annotate when the box starts
// empty, because there is nothing to infer from.
const numbers = new Box<number>().add(1).add(2);
console.log(numbers.mapTo((n) => `#${n}`).toArray()); // [ '#1', '#2' ]

// A constraint works the same as on a function, and `static` members may *not*
// reference `Value` - statics exist once, before any instance picks a type.
class Index<Item extends { readonly id: string }> {
  static readonly kind = "index"; // ✅ static, no type parameter in sight
  // static empty: Item;          // ❌ static members cannot reference class type parameters

  readonly #byId = new Map<string, Item>();

  add(item: Item): void {
    this.#byId.set(item.id, item);
  }

  get(id: string): Item | undefined {
    return this.#byId.get(id);
  }
}

const index = new Index<{ id: string; label: string }>();
index.add({ id: "a", label: "Alpha" });
console.log(Index.kind, index.get("a")?.label); // index Alpha

// --- A registry of constructors keyed by a union -----------------------------------

// When *what to build* is data, the lookup table wants to be exhaustive: adding
// a member to the union should break the table until its class exists.
type ShapeKind = "circle" | "square";

interface Shape {
  readonly kind: ShapeKind;
  area(): number;
}

class Circle implements Shape {
  readonly kind = "circle";

  constructor(readonly radius: number) {}

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Square implements Shape {
  readonly kind = "square";

  constructor(readonly side: number) {}

  area(): number {
    return this.side ** 2;
  }
}

const shapeClasses = {
  circle: Circle,
  square: Square,
} as const satisfies Record<ShapeKind, new (size: number) => Shape>;

// Indexing with a union key produces a *union of constructors*, and calling one
// needs an argument assignable to the intersection of their parameters. Tying
// the key to a single `K` avoids that - the same fix the factory registry uses.
function createShape<K extends ShapeKind>(kind: K, size: number): InstanceType<(typeof shapeClasses)[K]> {
  return new shapeClasses[kind](size) as InstanceType<(typeof shapeClasses)[K]>;
}

const circle = createShape("circle", 2);
console.log(circle.kind, circle.radius, circle.area().toFixed(2)); // circle 2 12.57

// --- Classes as dependencies ------------------------------------------------------

// Because a class is a value, "inject the class" and "inject the instance" are
// both ordinary parameters. Prefer the instance: the class is only the right
// choice when the collaborator's *lifetime* belongs to the callee.
class Connection {
  constructor(readonly url: string) {}

  query(sql: string): string {
    return `${sql} @ ${this.url}`;
  }
}

class PerRequestService {
  constructor(
    private readonly ConnectionClass: new (url: string) => Connection,
    private readonly url: string,
  ) {}

  handle(sql: string): string {
    // A fresh connection per call - the reason the class, not an instance, is
    // the dependency here.
    return new this.ConnectionClass(this.url).query(sql);
  }
}

console.log(new PerRequestService(Connection, "db://local").handle("select 1")); // select 1 @ db://local

export { UppercasePlugin, ReversePlugin, runAll, instantiate, Box, Index };
export { Circle, Square, createShape, Connection, PerRequestService };
export type { Plugin, PluginClass, UppercaseInstance, UppercaseArgs, ShapeKind, Shape };
