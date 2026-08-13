/**
 * The `this` type: a type that means "whatever subclass this actually is".
 *
 * Returning the class's own name from a chainable method quietly breaks
 * inheritance. `this` is the fix, and the same type shows up in two other
 * places worth knowing: `this` parameters, and `this is T` guards.
 */

// --- Why returning the class name breaks subclasses ------------------------------

class BrokenQuery {
  protected readonly parts: string[] = [];

  // ❌ hard-codes the base class as the return type
  where(clause: string): BrokenQuery {
    this.parts.push(`WHERE ${clause}`);
    return this;
  }
}

class BrokenPagedQuery extends BrokenQuery {
  limit(n: number): BrokenPagedQuery {
    this.parts.push(`LIMIT ${n}`);
    return this;
  }
}

// new BrokenPagedQuery().where("id = 1").limit(10);
// ❌ Property 'limit' does not exist on type 'BrokenQuery'.
//
// The instance really is a BrokenPagedQuery - only the *type* was thrown away
// by the base class's return annotation.

// --- `this` keeps the subclass ---------------------------------------------------

class Query {
  protected readonly parts: string[] = [];

  // ✅ `this` resolves to the type of whatever the method was called on
  where(clause: string): this {
    this.parts.push(`WHERE ${clause}`);
    return this;
  }

  orderBy(column: string): this {
    this.parts.push(`ORDER BY ${column}`);
    return this;
  }

  build(): string {
    return this.parts.join(" ");
  }
}

class PagedQuery extends Query {
  limit(n: number): this {
    this.parts.push(`LIMIT ${n}`);
    return this;
  }
}

// Every hop keeps the concrete type, in any order.
console.log(new PagedQuery().where("id = 1").limit(10).orderBy("name").build());
// WHERE id = 1 LIMIT 10 ORDER BY name

// `this` is inferred when a method has no return annotation and returns `this`,
// but annotate it anyway: the annotation is what makes the promise part of the
// published signature rather than an accident of the implementation.

// --- `this` as a parameter type ---------------------------------------------------

class Vector {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  // "another one of exactly my type". In a subclass this automatically means
  // the subclass - which is usually what an equality or merge method wants.
  equals(other: this): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

class Vector3 extends Vector {
  constructor(
    x: number,
    y: number,
    readonly z: number,
  ) {
    super(x, y);
  }

  override equals(other: this): boolean {
    return super.equals(other) && this.z === other.z;
  }
}

console.log(new Vector3(1, 2, 3).equals(new Vector3(1, 2, 3))); // true
// new Vector3(1, 2, 3).equals(new Vector(1, 2));   // ❌ Property 'z' is missing

// ⚠️ `this` in a parameter position is unsound in the same way method parameter
// bivariance is: a variable typed as the *base* class can hold a subclass
// instance, and then `base.equals(otherBase)` type-checks while the subclass's
// override reads a property that is not there. Use it for value objects that
// are compared with their own kind; use an explicit type for anything a caller
// might hold through a base-class reference.

// --- `this is T`: a guard that narrows the receiver --------------------------------

// A type predicate on `this` narrows the object itself, which turns a runtime
// capability check into type information.
class FileEntry {
  constructor(
    readonly path: string,
    private readonly bytes: Uint8Array | undefined,
  ) {}

  // The intersection is what does the work: `content` is
  // `(Uint8Array | undefined) & Uint8Array`, i.e. `Uint8Array`, inside the guard.
  isLoaded(): this is FileEntry & { readonly content: Uint8Array } {
    return this.bytes !== undefined;
  }

  get content(): Uint8Array | undefined {
    return this.bytes;
  }
}

const entry = new FileEntry("a.txt", new Uint8Array([1, 2, 3]));
console.log(entry.content?.length); // 3 - the unguarded read needs `?.`
if (entry.isLoaded()) {
  console.log(entry.content.length); // 3 - no `?.`, no cast, no `!`
}

// The same predicate shape is what makes a class hierarchy narrowable without
// `instanceof` sprinkled through the callers:
abstract class Node {
  isBranch(): this is Branch {
    return this instanceof Branch;
  }

  abstract describe(): string;
}

class Leaf extends Node {
  constructor(readonly value: number) {
    super();
  }

  override describe(): string {
    return String(this.value);
  }
}

class Branch extends Node {
  constructor(readonly children: readonly Node[]) {
    super();
  }

  override describe(): string {
    return `(${this.children.map((child) => child.describe()).join(" ")})`;
  }
}

const tree: Node = new Branch([new Leaf(1), new Branch([new Leaf(2)])]);
console.log(tree.isBranch() ? tree.children.length : 0); // 2
console.log(tree.describe()); // (1 (2))

export { Query, PagedQuery, Vector, Vector3, FileEntry, Node, Leaf, Branch };
export { BrokenQuery, BrokenPagedQuery };
