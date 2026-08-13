# Classes with Interfaces & Types

`class Foo {}` introduces two things with one keyword: a **value** (the
constructor function) and a **type** (the shape of an instance). Almost every
question about combining classes with TypeScript's type system comes down to
keeping those two straight - `Foo` is one instance, `typeof Foo` is the class.

## `implements` is a check, not inheritance

The clause asserts that the class satisfies a contract. Nothing is emitted, no
method arrives for free, and there is no such thing as an interface with a
default implementation.

<<< ../../examples/typescript/classes/implements-and-interfaces.ts{1-67}

What it buys is **where the error lands**. Without `implements`, a class with a
missing member is still structurally wrong - but the compiler only says so at
whichever call site happens to need that member first, which may be in another
package. With it, the error is on the class declaration:

```
Class 'MemoryCache<Value>' incorrectly implements interface 'Cache<Value>'.
  Property 'set' is missing in type 'MemoryCache<Value>'.
```

A class may implement several interfaces, and each is checked independently.
Note that an interface's `readonly` property is satisfied by a getter, a
`readonly` field, or even a plain mutable one - `readonly` constrains the
caller, not the implementation.

::: tip interface or type alias?
For a contract a class implements, they behave identically. Prefer `interface`
when a consumer might need to extend or merge it, and follow whatever the
surrounding code already does. The
[general best practices](./general-best-practices) page has the longer version.
:::

## Structural, until a class has private state

TypeScript is structural: any object of the right shape satisfies the type,
which is what makes test doubles object literals rather than subclasses.

A class type with `private` or `#private` members is the exception. It is
effectively **nominal** - no object literal can produce the private slot, so
only instances of that exact class satisfy it.

<<< ../../examples/typescript/classes/implements-and-interfaces.ts{69-103}

That is a feature when you want a value nobody can forge, and a nuisance when
you wanted a mock. The rule that follows: **contracts meant to be doubled should
be interfaces**, and classes with private state should be the implementations,
not the parameter types. (For unforgeable values without a class, see the
branded types in [Type-Safe Validation](./type-safe-validation).)

## What `implements` does not check: the static side

An interface constrains instances. It says nothing about the constructor, and
nothing about `static` members. Those are described by a separate interface,
applied to the class object itself - and `satisfies` is the cleanest way to do
it, because it checks without widening the class's own type.

<<< ../../examples/typescript/classes/implements-and-interfaces.ts{105-168}

| Expression | Type of |
| --- | --- |
| `JsonSerializer` (as a type) | one **instance** |
| `typeof JsonSerializer` | the **class object**: statics + construct signature |
| `InstanceType<typeof JsonSerializer>` | one instance again, derived |
| `ConstructorParameters<typeof JsonSerializer>` | the constructor's parameter tuple |

`interface X extends SomeClass` copies a class's member types (including private
ones, which is why only its subclasses can then implement it). It is the tidy
way to say "the same shape, minus the implementation".

## Construct signatures: passing a class as a value

`new (...args) => T` is the type of "something you can call with `new`". This is
what a parameter should be when a function receives a *class* rather than an
instance - the caller decides what to build, the callee decides when.

<<< ../../examples/typescript/classes/constructor-types.ts{1-71}

Derive the related types rather than writing them out again: `InstanceType` and
`ConstructorParameters` stay correct when the constructor changes, and
hand-written duplicates do not. See
[Derive Types with `typeof`](./derive-types-with-typeof) for the same idea
applied to functions and values.

## Generic classes

A type parameter on the class is in scope for every member and is fixed when the
instance is created. That is the difference from a generic *method*, which is
resolved per call.

<<< ../../examples/typescript/classes/constructor-types.ts{73-121}

Two rules worth memorizing:

- **`static` members cannot reference the class's type parameters.** Statics
  exist once, before any instance picks a type.
- **Annotate when there is nothing to infer from.** `new Box<number>()` is
  necessary because an empty box has no argument to infer `Value` from; a
  factory taking an initial value would not need it.

## A registry of constructors keyed by a union

When *what to build* is described by data, the lookup table should be
exhaustive - adding a member to the union ought to break the table until its
class exists. `satisfies Record<Kind, ...>` is what enforces that.

<<< ../../examples/typescript/classes/constructor-types.ts{123-199}

::: warning Indexing with a union key
`shapeClasses[spec.kind](size)` where `kind` is a union produces a **union of
constructors**, and calling one requires an argument assignable to the
*intersection* of their parameters. Tying the key to a single type parameter
`K`, as above, avoids it. The same trap and the same fixes are covered under
[factory registries](./factory-functions#a-registry-of-factories).
:::

Because a class is a value, "inject the class" and "inject the instance" are
both ordinary parameters. Prefer the instance - the class is only the right
dependency when its *lifetime* belongs to the callee, as with a connection
created fresh per request.

## Summary

- A class declaration creates a value and a type. `Foo` is an instance,
  `typeof Foo` is the class object.
- `implements` moves the error onto the class declaration. It adds nothing at
  runtime and never supplies an implementation.
- `private`/`#private` members make a class type nominal - keep contracts that
  need doubles as interfaces.
- The static side needs its own interface, applied with `satisfies`.
- Use `new (...) => T` for a class parameter, and derive the rest with
  `InstanceType` / `ConstructorParameters`.
- Statics cannot use class type parameters; a registry keyed by a union needs a
  single `K` to be callable.
