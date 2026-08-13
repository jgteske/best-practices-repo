# Chaining & Fluent Builders

A chainable API is just methods that return something with more methods on it.
Every interesting decision is about *what* they return - `this`, a new instance,
or a **differently typed** instance - and each answer fixes a different problem.

## `this` is the return type, not the class name

Returning the class's own name from a chainable method quietly breaks
inheritance: the instance really is a subclass, but the base class's annotation
threw that away.

<<< ../../examples/typescript/classes/polymorphic-this.ts{1-68}

```ts
new BrokenPagedQuery().where("id = 1").limit(10);
// ❌ Property 'limit' does not exist on type 'BrokenQuery'.

new PagedQuery().where("id = 1").limit(10).orderBy("name");
// ✅ every hop keeps the concrete type, in any order
```

`this` is inferred when a method has no return annotation and returns `this` -
annotate it anyway. The annotation is what makes the promise part of the
published signature rather than an accident of the implementation.

## `this` in parameter and guard positions

The same type is useful in two other places.

<<< ../../examples/typescript/classes/polymorphic-this.ts{70-171}

**As a parameter**, `equals(other: this)` means "another one of exactly my
type", which automatically means the subclass in a subclass. It is unsound in
the same way [method parameter bivariance](./abstract-classes-and-inheritance#override-is-not-decoration)
is - a variable typed as the base class can hold a subclass instance - so keep
it for value objects compared with their own kind.

**As a guard**, `isLoaded(): this is FileEntry & { readonly content: Uint8Array }`
narrows the receiver itself. A runtime capability check becomes type
information, and the caller needs no cast, no `!`, and no `?.`. The same shape
(`isBranch(): this is Branch`) is how a class hierarchy becomes narrowable
without `instanceof` scattered through the callers - the class-based sibling of
[discriminated unions](./modeling-with-unions).

## Three kinds of chain

<<< ../../examples/typescript/classes/fluent-builder.ts{1-63}

**Mutable, returning `this`.** The simplest chain: every method mutates and
hands the same object back. Fine when the builder is created, used, and thrown
away in a single expression.

::: warning A mutable builder has no branches
```ts
const shared = new MutableRequestBuilder().url("/users");
const asJson = shared.header("accept", "json");
const asXml  = shared.header("accept", "xml");

asJson === asXml;                    // true
asJson.build().headers["accept"];    // "xml"
```
Both names point at the same builder and the second call overwrote the first.
This is the bug that makes mutable builders unsafe to store in a variable.
:::

<<< ../../examples/typescript/classes/fluent-builder.ts{65-102}

**Immutable, returning a new instance.** Each step returns a fresh object, so a
partially configured builder is safe to share, reuse, and branch from. The trade
is one allocation per step - for configuration built once at startup, that is
not measurable, and the safety is.

Note the `private constructor` plus `static to(...)`: callers get a named entry
point that validates once, and there is no way to skip it.

### Type-state: a `build()` that only exists once it is legal

The builder carries a type parameter listing which required fields have been
supplied so far. Each setter adds to it, and `build` uses a
[`this` parameter](./class-methods-and-callers#making-the-compiler-see-it-the-this-parameter)
to demand the full set - so calling it too early is a compile error, not a
runtime `throw`.

<<< ../../examples/typescript/classes/fluent-builder.ts{104-169}

```ts
SafeRequestBuilder.create().url("/users").build();
// ❌ The 'this' context of type 'SafeRequestBuilder<"url">' is not assignable to
//    method's 'this' of type 'SafeRequestBuilder<"url" | "method">'.
```

| Style | Branching | Required fields | Cost |
| --- | --- | --- | --- |
| Mutable, `this` | ❌ aliases silently | runtime `throw` | one object |
| Immutable, new instance | ✅ | runtime `throw` | one object per step |
| Type-state | ✅ | **compile error** | one object per step, plus a type parameter |

::: tip Do not build a builder for three fields
A chain earns its keep when there are many optional steps, an order worth
enforcing, or a configuration reused across branches. Otherwise an options
object says the same thing with no API to learn and no partially constructed
state to reason about - and it is far easier to type.
:::

## Summary

- Return `this`, never the class name, or subclasses lose their own methods
  halfway through a chain.
- `other: this` means "my exact type" - good for value objects, unsound through
  a base-class reference.
- `this is T` narrows the receiver and removes casts at the call site.
- Mutable chains alias: two "branches" from one stored builder are the same
  object.
- Immutable chains cost an allocation per step and are worth it for anything
  stored in a variable.
- Type-state plus a `this` parameter turns "you forgot a required field" into a
  compile error.
- For a handful of options, an options object beats a builder.
