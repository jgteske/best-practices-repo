# Classes, Fields & Constructors

A class declaration is denser than it looks. `class Foo {}` introduces a value
and a type; a field can be `readonly`, `static`, `private`, `#private`,
`declare`d, or declared with a `!`; and a parameter list can declare fields of
its own. Most of the confusion around classes in TypeScript comes from mixing up
which of those are compile-time fictions and which are real at runtime.

## Fields, and the two kinds of private

<<< ../../examples/typescript/classes/fields-and-constructors.ts{1-72}

| Modifier | Enforced by | Visible at runtime? |
| --- | --- | --- |
| `readonly` | the compiler | yes - a plain, writable property |
| `private` | the compiler | yes - `(obj as any).field` reaches it |
| `protected` | the compiler | yes |
| `#field` | **the language** | no - not in `Object.keys`, `JSON.stringify`, or a `for...in` |
| `static` | - | on the class object, not the instance |

The choice between `private` and `#private` is the one that matters:

- **`#private` when the invariant is real.** State that must not be reachable -
  a key, a socket, a cached value that would be wrong if written from outside.
  It survives a cast, a JSON round-trip, and a debugger.
- **`private` when the intent is documentation.** It is friendlier to tests and
  to serialization, and it does not make the class type
  [nominal](./classes-with-interfaces#structural-until-a-class-has-private-state)
  the way `#private` does.

::: warning `private` is not a security boundary
`private` is erased at compile time. If a value must be unreachable from
JavaScript that you do not control, it needs `#field` or a closure - see
[Factory Functions](./factory-functions).
:::

## Parameter properties, and the ordering trap they hide

`constructor(readonly amount: number)` declares the field, types it, and assigns
it in one place. It is the right default for data holders, and the wrong one for
anything that validates or transforms its input, because the assignment happens
before you get a chance to look at the value.

The trap is that a field initializer **cannot see a parameter property**. Field
initializers run when the instance is created; parameter properties are assigned
in the constructor *body*, which is later:

```ts
// the direct read: caught
class Widget {
  label = `#${this.id}`;              // ❌ TS2729: 'id' is used before its initialization
  constructor(public id: string) {}
}

// the same bug, one call deeper: not caught
class WidgetIndirect {
  label = this.makeLabel();           // ✅ compiles, ❌ label is "#undefined" at runtime
  constructor(public id: string) {}
  makeLabel() { return `#${this.id}`; }
}
```

The compiler catches the direct read and misses the indirect one. Anything
derived from a constructor argument belongs in the constructor body.

<<< ../../examples/typescript/classes/fields-and-constructors.ts{74-127}

## `!`, `declare`, and the two things they turn off

Both of these switch off a check, and both need a reason better than "the
compiler was complaining".

**`field!: T`** - a definite assignment assertion. It says the field is set
before anything reads it, by some path the compiler cannot see (a lifecycle
method, a framework, a test harness). A discriminated union that makes the
"not ready yet" state visible is almost always the better answer - see
[Make Illegal States Unrepresentable](./modeling-with-unions).

**`declare field: T`** - re-types an inherited field without redeclaring it.
This one is not optional. With `target: ES2022`, a field declaration emits a
real class field, so redeclaring a base class property in a subclass silently
overwrites whatever the base constructor assigned:

```ts
class DogShelter extends Shelter {
  resident: Dog;    // ❌ emits a field initialized to undefined; the base's value is gone
  declare resident: Dog;  // ✅ narrows the type, emits nothing
}
```

<<< ../../examples/typescript/classes/fields-and-constructors.ts{129-196}

## One constructor, several ways in

A class gets exactly one constructor implementation. Overload signatures let it
accept more than one shape, but every call site still writes `new Range(...)`
and the implementation has to work out which call it received.

Static factory methods are usually the better trade: each entry point gets a
name, its own signature, and its own validation, and a `private constructor`
funnels every path through one place.

<<< ../../examples/typescript/classes/fields-and-constructors.ts{198-249}

| | Constructor overloads | Static factory methods |
| --- | --- | --- |
| Call site | `new Range(2, 7)` - what does that mean? | `Duration.fromSeconds(1.5)` |
| Validation | one body, branching on argument shape | one per entry point |
| Async construction | impossible - a constructor cannot `await` | `static async load()` is normal |
| Returning a cached instance | impossible - `new` always allocates | trivial |

::: tip A constructor cannot be async
If building the object requires I/O, the constructor takes the *result*, and a
`static async create()` does the I/O. A half-constructed object waiting for a
promise to settle is the bug this avoids.
:::

## Getters, setters, and static blocks

An accessor looks like a property at the call site but runs code. That is what
makes it good for derived state and validation, and bad for anything a caller
would want to know it is paying for.

<<< ../../examples/typescript/classes/accessors-and-computed-state.ts

| Use | For |
| --- | --- |
| `readonly` field | a value fixed at construction |
| getter | a value derived from state that changes |
| getter + setter | validation or normalization on write - and they may have **different types** |
| method | anything async, slow, fallible, or with side effects |

`get fresh()` that hits the network is the anti-pattern this table exists to
prevent: callers cannot see the cost, cannot pass a signal, and cannot handle a
rejection. `await refresh()` is honest about all three.

`static {}` blocks run once, when the class is defined, and can see the class's
private statics - the place for setup too complex for an initializer. Note that
a `static readonly` field cannot be assigned from one: the compiler only exempts
`readonly` *instance* fields, and only inside the constructor.

## Summary

- `#private` is a runtime boundary; `private`, `protected` and `readonly` are
  compile-time rules that a cast defeats.
- Parameter properties are for data holders. A field initializer cannot read
  one - the compiler catches the direct case and misses the indirect one.
- `!` disables a real check; prefer a union that makes the uninitialized state
  visible.
- `declare` is mandatory when narrowing an inherited field, or the emitted field
  overwrites the base class's value with `undefined`.
- Prefer named static factories to constructor overloads, and remember that a
  constructor cannot be `async`.
- Getter for derived state, method for work. Accessors may have different
  getter and setter types.
