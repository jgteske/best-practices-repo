# Design Patterns in TypeScript

Most of the Gang of Four catalogue describes solutions to problems that
TypeScript does not have. Strategy exists because a Java method is not a value.
Command exists because an action could not be data. Visitor exists because
there was no pattern matching. Singleton exists because there was no module
system.

The *problems* are still real - swapping an algorithm, queueing an action,
adding an operation to a closed set of types. What changes is the amount of
code the answer takes, and it is usually a function.

| Classic form | Idiomatic TypeScript |
| --- | --- |
| Strategy: interface + N classes | a record of functions |
| Decorator: wrapper class | a higher-order function |
| Command: `ICommand` objects | a tagged union + a reducer |
| Visitor: double dispatch | an exhaustive `switch` over a union |
| Observer: `Subject` base class | a closure over a `Set` of listeners |
| Builder: mutable builder object | an options object - or a typed fluent chain |
| Adapter: wrapper class | a function to your own shape |
| Factory: `AbstractFactory` | [a function that returns an object](./factory-functions) |
| Singleton: `getInstance()` | a module - and usually a parameter instead |

## Strategy: a record of functions

The interface with one method *is* a function type, so the implementations are
functions and the context object holding them is a lookup table.

<<< ../../examples/typescript/patterns/strategy.ts

This is the shape being replaced - not wrong, just four times the code for the
same behaviour:

```ts
// the classic form: an interface, N implementations, and a context
interface PricingStrategy { price(cents: number): number; }
class StandardPricing implements PricingStrategy { price(c: number) { return c; } }
class MemberPricing implements PricingStrategy { price(c: number) { return Math.round(c * 0.9); } }
class PricingContext {
  constructor(private readonly strategy: PricingStrategy) {}
  price(cents: number) { return this.strategy.price(cents); }
}
```

Keying the record by a union rather than `string` is what makes the pattern
safer than its classic form: leaving out `staff` is a compile error
(`Property 'staff' is missing in type … but required in type 'Record<Tier, Pricing>'`),
whereas a registry keyed by `string` would have failed at runtime, in
production, for one tier of customer.

When a strategy needs configuration, return one from a function; when it needs
state as well, return an object. Both are still just factories.

## Decorator: a function that returns the same shape

Wrapping a function is a higher-order function whose generics preserve the
signature. Wrapping an object is a function from the port to the port -
structural typing means the caller cannot tell it happened.

<<< ../../examples/typescript/patterns/decorator.ts

The generic parameters `A` and `R` are what make this transparent: the wrapped
function keeps its exact arity and return type, so no `any` leaks and no
`Parameters<…>`/`ReturnType<…>` juggling is needed. Composition order is
meaning, not style - `withTiming(withRetry(fn))` times the whole retry
sequence, and swapping them times each attempt.

::: tip Not `@decorator`
TypeScript's `@decorator` syntax is an unrelated feature aimed at annotating
class members, and it drags in `experimentalDecorators`/`emitDecoratorMetadata`
or the newer standard semantics. The pattern on this page needs neither.
:::

## Command: actions as data

Modelling an action as a tagged union instead of an object with `execute()`
keeps everything the pattern is for - queueing, logging, undo, replay - and
adds something the class version cannot do: a command survives
`JSON.stringify`, so it can cross a network boundary or sit in `localStorage`.

<<< ../../examples/typescript/patterns/command.ts

One reducer replaces every `execute()` method, and the `switch` is exhaustive,
so a new command type fails the build until it is handled. Because the history
is an array, "current state" is a `reduce` - persist the log and every past
state is recoverable.

`invert` is the `undo()` method, moved outside the command and given the state
it applied to. Returning `Command | undefined` makes "this action cannot be
undone" a value the caller must handle rather than a method that quietly does
nothing.

## Visitor: a union and a function

Visitor's purpose is to add an operation to a closed set of types without
editing them - double dispatch as a workaround for missing pattern matching. A
discriminated union plus a function *is* that, with no `accept(visitor)` method
and no visitor interface.

<<< ../../examples/typescript/patterns/visitor.ts

`evaluate`, `format` and `depth` were each added without touching `Expr` or one
another. The trade-off is the other half of the expression problem: adding a
*variant* to the union touches every operation - which the compiler enumerates
for you, one error per operation, rather than leaving you to find them.

The `match` helper is the reusable form of the dispatch that
[the factory registry](./factory-functions#a-registry-of-factories) hits: it
takes a record of handlers, requires every kind to be present, and hands each
handler its own narrowed member. The single cast lives inside the helper, which
is the right place for it - the signature keeps every caller honest.

## Observer: a closure over listeners

No `Subject` base class, no `attach`/`detach`/`notify`. A `Set` in a closure,
a type parameter for the payload, and an unsubscribe function as the return
value of `subscribe`.

<<< ../../examples/typescript/patterns/observer.ts

Returning the unsubscribe function is the detail worth copying. An
`off(listener)` API forces every caller to keep the original reference, and
silently does nothing when they pass a fresh arrow that merely looks the same -
a leak with no error message. Emitting over a copy of the set is the other:
without it, a listener that unsubscribes while handling an event mutates the
collection being iterated.

For an object with several kinds of event, key the payloads by name and make
`on`/`emit` generic over that map, so the payload type follows the event name.
[Event Listeners with Classes](./event-listeners-with-classes) builds the full
version, including DOM cleanup with `AbortController`.

## Builder: usually an options object

Most builders exist to work around languages without named or optional
arguments. TypeScript has an options object - start there, and skip the
terminal `build()` entirely.

The fluent form earns its keep in one situation: when "which fields have been
set" needs tracking, so that `build()` is unavailable until the object is
complete.

<<< ../../examples/typescript/patterns/builder.ts

`Have` accumulates the steps that have been called, and `build` is attached by
a conditional type only once every required step is present. Calling it early
is a compile error, not a runtime one:

```ts
// ❌ Property 'build' does not exist on type 'QueryBuilder<"from">'.
createQueryBuilder().from("users").build();

// ❌ Property 'build' does not exist on type 'QueryBuilder<never>'.
createQueryBuilder().build();
```

That guarantee is the only reason to prefer this over an options object. If
every field is optional, or the type already requires what matters, the chain
is decoration - and it costs a cast inside the factory plus a type parameter
in every signature.

## Adapter: a function to your own shape

The value is not the translation, it is the boundary. The vendor's vocabulary -
snake_case keys, amounts as strings, `"DENIED"` - stops at the adapter, and the
rest of the codebase sees only the domain type.

<<< ../../examples/typescript/patterns/adapter.ts

Mapping the vendor's status through a `Record` keyed by *their* union, rather
than a `switch` with a `default`, is what makes the boundary maintainable: when
the provider adds a status and the vendor types are updated, the mapping fails
to compile instead of silently bucketing the new case as "pending".

Adapting a whole client to a port is the same move one level up, and it
composes with [the composition root](./factory-functions#ports-doubles-and-the-composition-root):
swapping providers becomes one line, and a fake gateway is another object of
the same shape.

## Singleton: a module, and a warning

ES modules are evaluated once, so a module-scoped value already is a singleton.
`getInstance()` exists in languages without a module system.

<<< ../../examples/typescript/patterns/singleton.ts

The mechanics are three lines - `??=` for lazy initialisation, and caching the
**promise** rather than the resolved value for the async case, so two
concurrent callers cannot both start the work.

The real content is the warning. A module-level instance is a dependency that
no signature mentions: it cannot be substituted in a test, it cannot differ per
request or per tenant, and two tests that touch it are no longer independent.
The usual patch is a `resetForTests()` export, which is a reliable sign the
value wanted to be a parameter. Keep the lazy getter, but let callers receive
what they use.

## When the class version is right

The class forms are not obsolete, and three situations still favour them:

| Situation | Why |
| --- | --- |
| The framework defines the shape | An Angular service, a TypeORM entity, a custom element - implement what the framework expects. |
| `instanceof` is part of the contract | Error subclasses, and any API that branches on the constructor. |
| Deep, genuinely shared behaviour | When several implementations share substantial state *and* code, a base class can beat repeating a closure - measure before assuming. |

The failure mode worth avoiding is the opposite of "too few classes": a
`StrategyFactoryProvider` hierarchy standing in for a `Record` of three
functions. Reach for the pattern's *name* to communicate intent, and for the
language's smallest expression of it to implement.

## Summary

- Most GoF patterns solve problems TypeScript does not have; keep the intent,
  drop the class scaffolding.
- **Strategy** is a `Record<Union, Fn>`; keying it by a union makes a missing
  case a compile error.
- **Decorator** is a generic higher-order function (or port → port), and
  composition order changes behaviour.
- **Command** is a tagged union plus a reducer - serializable, replayable, and
  invertible from outside.
- **Visitor** is an exhaustive `switch`; a `match` helper gives you the
  handler-record form when the visitor must be a value.
- **Observer** is a closure over a `Set`; return the unsubscribe function and
  iterate a copy when emitting.
- **Builder** is an options object unless you need `build()` to be unavailable
  until required fields are set.
- **Adapter** is a function into your domain type, with vendor status unions
  mapped through a `Record` so new cases break the build.
- **Singleton** is a module - and usually should have been a parameter.
