# Classes at Runtime

[Objects, Prototypes & Classes](./objects-and-classes) covers what `class`
desugars to. This page is about what it *does* - the order initializers run in,
how `this` gets lost, what `super` looks up, and the ES2022 features that have
no equivalent in an object literal.

Everything below is plain JavaScript. The
[TypeScript Classes section](/typescript/classes-and-constructors) covers the
parts that only exist at compile time - `abstract`, `implements`, `private`
versus `#private`, and typing a constructor.

<<< ../../examples/javascript/language/class-runtime-semantics.mjs{js}

## The order everything runs in

```
construction order:
  1. derived constructor body, before super()
  2. base field initializer
  3. base parameter default
  4. base constructor body
  5. derived field initializer
  6. derived constructor body, after super()
```

Two of those surprise almost everybody.

**A base class initializes its fields before its own parameter defaults.** Field
initialization is part of *creating* the object, which happens before the
constructor body is entered - and parameter defaults are evaluated on entry.

**A derived class initializes its fields only once `super()` returns.** This is
the one that causes bugs: a base constructor that calls a method the subclass
has overridden runs that override before any of the subclass's fields exist.

```js
class Renderer {
  constructor() { console.log(this.render()); }   // ❌ calls the override
  render() { return "<base />"; }
}
class ButtonRenderer extends Renderer {
  label = "OK";                                    // assigned after super() returned
  render() { return `<button>${this.label}</button>`; }
}
new ButtonRenderer();                              // <button>undefined</button>
```

With a `#private` field it is worse than `undefined` - reading one before its
initializer has run throws a `TypeError`. Never call an overridable method from
a constructor; expose an `init()` the caller invokes, or a static factory that
constructs first and then calls.

## `this` is decided by the call

```
this binding:
  detached method ................. TypeError: Cannot read properties of undefined (reading '#ticks')
  .bind / arrow field / wrapper ... 4 ticks recorded
  arrow field is per instance ..... true
  method is on the prototype ...... true
```

`obj.method()` binds `this` to `obj`. Every other call form - a detached
reference, a callback, a destructured method - does not, and because module code
is always strict mode, `this` is `undefined` rather than the global object.

| Form | `this` | Notes |
| --- | --- | --- |
| `obj.method()` | the object | the only call form that binds it for you |
| `const m = obj.method; m()` | `undefined` | destructuring does this too |
| `arr.map(obj.method)` | `undefined` | and it passes `(value, index, array)` |
| `obj.method.bind(obj)` | the object | one bound function; keep the reference |
| `() => obj.method()` | the object | a new arrow each time - cannot be unregistered |
| arrow class field | the object | one closure **per instance**, stable identity |

Methods live on the prototype, so they are shared and cheap. An arrow field is
allocated per instance - the right default for event handlers, the wrong one for
ten thousand model objects.

## `super` continues the lookup

```
super:
  super.describe() ................ layer > overlay
  static `this` is the subclass ... Overlay
```

`super.describe()` resumes the property lookup at the *parent* prototype rather
than recursing into the method that is running. In a `static` method, `this` is
the class it was called on - which is why `static create() { return new this(); }`
inherited by a subclass builds the subclass.

## `new.target`

```
new.target:
  constructing the base ........... TypeError: AbstractRepository is abstract; extend it
  constructing a subclass ......... UserRepository
```

`new.target` is the constructor that was actually invoked - the closest thing
plain JavaScript has to `abstract`. It is also `undefined` when a function is
called without `new`, which is the standard guard for a callable that must not
be used as a plain function.

## `#private` is a real boundary, and a brand

```
#private:
  brand check on the real thing ... true
  brand check on a lookalike ...... false
  invisible to Object.keys ........ []
  invisible to JSON.stringify ..... {}
```

`#field in value` (ES2022) is a **brand check**: it is true only for objects
that were genuinely constructed by that class. Compared with the alternatives,
it cannot be forged the way a marker property can, and unlike `instanceof` it
does not break across realms (iframes, worker threads, `vm` contexts).

```js
static is(value) {
  return typeof value === "object" && value !== null && #code in value;
}
```

Private fields are also invisible to `Object.keys`, `JSON.stringify`, spread and
`for...in` - so a class whose state is entirely `#private` serializes to `{}`.
If instances need to survive a round trip, give the class an explicit `toJSON()`.

## Static blocks

```
static:
  populated by a static block ..... 3 true
```

A `static {}` block runs once, when the class is defined, with `this` bound to
the class. It can read and write `static #private` state, which is what makes it
the right home for setup too complex for a field initializer.

## Mixins in plain JavaScript

```
mixins:
  composed prototype chain ........ (anonymous) -> (anonymous) -> Note
  behaviour from both mixins ...... true true
  each call is a different class .. true
```

A mixin is a function that takes a class and returns a subclass of it, so
behaviour composes by nesting: `withJson(withTimestamps(Note))`. The prototype
chain shows the price - each layer is an anonymous class, which is what a stack
trace and a debugger will show you.

Each *call* also produces a distinct class, so `instanceof` only works against a
class you stored in a variable. The
[TypeScript version](/typescript/mixins-and-class-factories) adds the types and
the constraints that make a mixin declare what it needs from its base.

## Where things live

```
where things live:
  own properties of a note ........ ["text","createdAt"]
  own properties of a deck ........ [] (all #private)
  Deck.prototype .................. constructor, size, Symbol(Symbol.toStringTag), Symbol(Symbol.iterator)
```

Fields are enumerable own properties of the instance. Methods, getters, and
symbol-keyed members live on the prototype and are not enumerable. That single
distinction explains `JSON.stringify` output, what spreading an instance gives
you (`{ ...this }` is "the data"), and why `Object.hasOwn(obj, "toString")` is
false.

Implementing the well-known symbols is what makes a class feel built in:

| Symbol | Gives you |
| --- | --- |
| `[Symbol.iterator]()` | `for...of`, spread, destructuring, `Array.from` |
| `[Symbol.asyncIterator]()` | `for await...of` |
| `get [Symbol.toStringTag]()` | `[object Deck]` instead of `[object Object]` |
| `[Symbol.hasInstance](value)` | custom `instanceof` behaviour |
| `toJSON()` | control over `JSON.stringify` (not a symbol, but the same idea) |

## Summary

- Base fields initialize before the base's own parameter defaults; derived
  fields initialize only after `super()` returns.
- Never call an overridable method from a constructor - the subclass does not
  exist yet.
- `this` follows the call, and module code is strict, so a detached method gets
  `undefined`.
- `super.x()` continues the lookup; `this` in a `static` method is the class.
- `new.target` is the abstract-class guard plain JavaScript has.
- `#field in value` is an unforgeable, realm-safe brand check; `#private` state
  is invisible to serialization.
- Fields are enumerable own properties; methods and symbol members live on the
  prototype.
