# Objects, Prototypes & Classes

JavaScript has no classes underneath - it has objects that delegate to other
objects. `class` is real syntax with real semantics (private fields genuinely
are private), but the lookup mechanism it sits on is the prototype chain, and
knowing that explains `instanceof`, `super`, and why a method you defined does
not show up in `Object.keys`.

<<< ../../examples/javascript/language/classes-and-prototypes.mjs{js}

## The prototype chain

Every object has an internal link to another object - its prototype. Reading a
property that the object does not own walks that chain until it finds one or
hits `null`:

```
  derived.describe() .............. a widget
  own property? kind .............. true
  own property? describe .......... false  <- inherited
  chain ........................... derived -> base -> Object.prototype -> null
```

Writing, by contrast, always creates an **own** property on the object itself -
it never modifies the prototype. That asymmetry is what makes prototypes safe to
share.

Use `Object.hasOwn(obj, key)` (ES2022) to ask "is this the object's own?", not
the inherited `obj.hasOwnProperty(key)` - which breaks on objects created with
`Object.create(null)` and on anything with a property literally named
`hasOwnProperty`.

::: warning Never mutate a builtin prototype
`Array.prototype.last = function () { ... }` affects every array in the process,
including ones inside your dependencies, and adds an enumerable property that
breaks `for...in` loops. If a library did this to you, you would file a bug.
:::

## What `class` gives you

```
classes:
  toString ........................ Square(9) side=3
  getter .......................... 9
  methods live on the prototype ... true
  instanceof both ................. true true
  static registry ................. Square
  setter validation ............... RangeError: bad area: -1
  #area is not enumerable ......... createdAt, side
```

| Feature | Notes |
| --- | --- |
| **Methods** | Live on `Class.prototype` - one copy shared by every instance, which is why `Object.hasOwn(instance, "toString")` is false. |
| **Public fields** (`x = 1`) | Assigned per instance, in declaration order, **before** the constructor body runs. |
| **Private fields** (`#x`) | Genuinely inaccessible outside the class body - a syntax error, not a convention like `_x`. Invisible to `Object.keys`, `JSON.stringify`, and the debugger's property list. |
| **Getters/setters** | Look like properties at the call site but run code. Good for derived values and validation; bad for anything slow or async, because callers cannot tell they are paying for work. |
| **`static`** | On the class itself. `static` blocks run once at class definition; `static #private` works too. |
| **`extends` / `super`** | `super.method()` continues the lookup up the chain. `super(...)` **must** run before you touch `this` in a subclass constructor. |

`new.target` inside a constructor is the class that was actually instantiated -
useful for a registry, or for refusing to let an abstract base be constructed
directly.

[Classes at Runtime](./classes-at-runtime) takes each of those rows further: the
exact order initializers run in, the ways `this` goes missing, `#field in obj`
brand checks, static blocks, and mixins.

::: tip Prefer composition, and keep hierarchies shallow
Deep `extends` chains are as painful in JavaScript as anywhere else. A class
earns its keep when you need identity (`instanceof`), private state, and a fixed
set of operations. A plain object plus functions is usually the smaller answer -
and see the [TypeScript guide](/typescript/modeling-with-unions) for modelling
variants with unions rather than subclasses, or the
[Classes section](/typescript/classes-and-constructors) for the typed version of
everything on this page.
:::

## Freezing is shallow

```
freeze:
  top level write ................. TypeError (modules are strict mode)
  nested write went through ....... 5000
```

`Object.freeze` blocks adds, deletes, and writes to the object's **own**
properties. Nested objects are untouched. In strict mode - which every ES module
is, always - a blocked write throws; in sloppy mode it fails silently.

For a config object you want genuinely immutable, freeze recursively:

```js
function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") deepFreeze(nested);
  }
  return Object.freeze(value);
}
```

TypeScript's `readonly` and `as const` are the compile-time version of the same
idea, with no runtime cost - see
[Const Assertions](/typescript/const-assertions-and-enums).

## Property access without the ceremony

```
safe access:
  ?. short-circuits ............... undefined
  ?.[] and ?.() too ............... undefined undefined
  ?? only replaces null/undefined . fallback
  count ?? 0 keeps a real zero .... 0
```

- **`a?.b`** evaluates to `undefined` if `a` is `null`/`undefined` instead of
  throwing, and short-circuits the rest of the chain. The variants are `a?.[key]`
  and `fn?.()`.
- **`a ?? b`** falls back only on `null`/`undefined` - unlike `||`, which also
  fires on `0` and `""`.

Use `?.` for things that are *legitimately* optional. A chain three levels deep
usually means the shape should have been validated at the boundary instead - see
[Type-Safe Validation](/typescript/type-safe-validation).

## Objects as data

| Task | Use |
| --- | --- |
| Iterate keys/values/pairs | `Object.keys` / `Object.values` / `Object.entries` |
| Build from pairs | `Object.fromEntries(entries)` |
| Own property test | `Object.hasOwn(obj, key)` |
| Merge (later wins) | `{ ...a, ...b }` |
| A pure lookup table | `new Map()`, or `Object.create(null)` for no inherited keys |
| Non-string keys, insertion order, `.size` | `new Map()` - see [Arrays & Iteration](./arrays-and-iteration) |

A plain object's keys are always strings (or symbols), it inherits from
`Object.prototype`, and it has no `.size`. When the keys come from user data,
that inheritance is a real hazard - a key named `__proto__` or `constructor`
does not behave like data. `Map` has none of these problems.

## Summary

- Property lookup walks the prototype chain; writes always land on the object
  itself.
- `Object.hasOwn`, not `hasOwnProperty`. Never extend a builtin prototype.
- Methods live on the prototype; fields and `#private` state live per instance.
- `#private` is enforced by the language - `_private` is a request.
- `Object.freeze` is one level deep, and only throws because modules are strict.
- `?.` for genuinely optional access, `??` for absent-value fallbacks.
- When keys are data, reach for `Map` rather than a plain object.
