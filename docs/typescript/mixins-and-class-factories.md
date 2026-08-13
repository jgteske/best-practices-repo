# Mixins & Class Factories

`extends` gives you exactly one base class. A **mixin** lifts that restriction
by making the base a parameter: `withTimestamps(User)` is a function that takes
a class and returns a subclass of it, so behaviour composes by nesting calls.

The general form is more useful still - a function that returns a class it
builds from scratch, parameterised by whatever you pass in.

## The constructor type every mixin needs

<<< ../../examples/typescript/classes/mixins.ts{1-52}

```ts
type Ctor<Instance = object> = new (...args: any[]) => Instance;
```

This is the one place `any` is the right answer, and it is worth knowing why.
The mixin must accept a base class with *any* constructor signature and forward
its arguments untouched. Constructor parameters are checked contravariantly, so
a base declared `constructor(name: string)` is **not** assignable to
`new (...args: unknown[]) => T` - `unknown[]` and `never[]` both reject every
real class. `any[]` is what makes the pass-through possible.

Declaring the contribution as a named interface (`Timestamped`) is the other
half of a readable mixin: callers see a name, not an anonymous class expression,
and functions can ask for the slice they use.

## Requiring something of the base

Constrain the parameter and the mixin can use the base's members. This is how a
mixin declares its dependencies - and a class that lacks them fails at the
application site rather than somewhere inside the returned class.

<<< ../../examples/typescript/classes/mixins.ts{54-102}

Read `withStorage(withTimestamps(User))` inside-out: `User`, plus timestamps,
plus storage. The composed type is the intersection of everything applied, so a
consumer can ask for `HasId & Timestamped` instead of the concrete class -
which keeps the function usable with anything else assembled the same way.

Statics come along too: `Storage.storageKey` is reachable on the composed class.

## What mixins cost

<<< ../../examples/typescript/classes/mixins.ts{104-117}

::: warning Each call creates a new class
`withTimestamps(User) !== withTimestamps(User)`. `instanceof` only works against
a class you have a name for, so hold the composed class in a `const` and use
that everywhere - or check for the capability (`"touch" in user`) instead of the
class.
:::

The second cost is legibility. A failure inside
`withStorage(withTimestamps(withAudit(User)))` reports an anonymous class, and
the prototype chain in a debugger is a row of blanks. Two or three layers is
comfortable; past that, a collaborator passed to the constructor is easier to
read and to test.

### Mixing into an abstract base

`Ctor` cannot accept an abstract class - `abstract new (...args: any[]) => T`
can. The result stays abstract, so it can only be extended, which is usually
exactly what a "add retries to any job" mixin wants.

<<< ../../examples/typescript/classes/mixins.ts{119-157}

## Functions that return a class

Drop the "takes a class" part and you get the general pattern: a factory whose
product is a **class**. The test for whether it is the right tool:

> If the parameter varies per *instance*, it is a constructor argument. If it
> varies per *class* - it shows up in statics, in the type, or in something
> shared by every instance - it belongs to the factory.

### Typed error hierarchies

Every application ends up wanting several error classes that differ only by
name. Written out that is five lines each; from a factory it is one, and
`instanceof` plus the stack trace still work because these really are classes.

<<< ../../examples/typescript/classes/class-factories.ts{1-62}

Two details make this pattern work:

- **`const Name extends string`** keeps the literal, so `error.name` is
  `"ValidationError"` rather than `string`.
- **`type X = InstanceType<typeof X>`** re-merges the value and the type under
  one name, which is what a real `class X` declaration gives you for free.

::: warning Export the class, never the factory call
`createErrorClass("X") !== createErrorClass("X")`. If two modules each call the
factory, `instanceof` will disagree with both. Call it once, export the
constant.
:::

### A class parameterised by a schema

Here the factory argument shapes the *type* of every instance - something a
constructor parameter cannot do.

<<< ../../examples/typescript/classes/class-factories.ts{64-107}

`defineModel("User", { id: "string", age: "number" })` returns a class whose
constructor demands `{ id: string; age: number }`, whose statics know the field
names, and whose `validate()` closes over the schema. The mapped type doing the
work is the same machinery as
[Mapped & Conditional Types](./mapped-and-conditional-types).

### An abstract class as the product

A factory can hand back a base class that is deliberately incomplete: the
configuration is baked in, the behaviour is left to the subclass.

<<< ../../examples/typescript/classes/class-factories.ts{109-162}

`class UsersController extends createController({ prefix: "/api" })` is a legal
`extends` clause - the expression only has to evaluate to a constructor.

## Choosing between the three

| | Plain [factory function](./factory-functions) | Mixin | Class factory |
| --- | --- | --- | --- |
| Returns | an object | a subclass of what you passed | a new class |
| Use when | there is no `instanceof`, no statics, nobody extends it | behaviour must be *inherited* by an existing class | the class itself is the product |
| `any` required | no | yes, in the constructor type | no |
| Debuggability | good | anonymous classes in the chain | good, if you name the class expression |

Start with the factory function. Move to a mixin when a framework requires a
class, when `super` calls matter, or when the base is one you do not own. Reach
for a class factory when what you need to hand out is something to extend, to
check with `instanceof`, or to hang statics on.

The same `Timestamped` behaviour as a plain function is shorter, has no `any` in
it, and needs no `instanceof` caveats - which is the comparison worth making
before reaching for the prototype chain at all:

<<< ../../examples/typescript/classes/mixins.ts{159-182}

::: tip What about decorators?
TC39 decorators (TypeScript 5.0+) solve an overlapping problem - wrapping a
class or member without changing its call sites - and pair with the `accessor`
keyword from [Classes, Fields & Constructors](./classes-and-constructors#getters-setters-and-static-blocks).
They are a large enough topic to deserve their own page; this guide does not
have one yet.
:::

## Summary

- A mixin is `(Base) => class extends Base {...}`; compose by nesting.
- `new (...args: any[]) => T` is required - `unknown[]`/`never[]` reject real
  classes because constructor parameters are contravariant.
- Name the contribution with an interface so callers see a type, not an
  anonymous class.
- Constrain the base (`Ctor<HasId>`) to declare what the mixin needs; use
  `abstract new` to mix into an abstract class.
- Every call creates a distinct class - hold it in a `const`, and prefer
  capability checks to `instanceof`.
- Class factories are for parameters that vary per class, not per instance;
  merge the value and type with `type X = InstanceType<typeof X>`.
- If nothing is inherited, checked with `instanceof`, or hung on a static, a
  plain factory function is smaller and clearer.
