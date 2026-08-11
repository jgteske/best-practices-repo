# Factory Functions

A factory is a function that returns an object. That is the entire idea, and
it is the most useful structural pattern TypeScript has - not because classes
are bad, but because a closure plus structural typing already provides what
`class` provides, with less to remember and less to mock.

## A factory is a function that returns an object

The class version binds behaviour to `this` and hands out instances via `new`.
The factory version closes over its state and hands back a plain object.

<<< ../../examples/typescript/factories/factory-vs-class.ts

Three differences matter in practice.

**Privacy is real and free.** `#count` is genuinely private at runtime, but so
is a closed-over local - and the local needs no syntax, works in every target,
and cannot be reached by `Object.keys`, `JSON.stringify`, or a debugger walking
the object.

**There is no `this` to lose.** This is the one that bites, because the
compiler cannot see it:

```ts
// ❌ compiles; throws at runtime
setTimeout(counter.increment, 100);
element.addEventListener("click", widget.handleClick);
form.querySelectorAll("input").forEach(widget.register);

// ✅ correct, and needed at every single call site
setTimeout(() => counter.increment(), 100);
element.addEventListener("click", widget.handleClick.bind(widget));
```

A factory's methods are closures, so passing one around is unremarkable.

**Structural typing removes the boilerplate.** A factory's return type is
checked against the contract without an `implements` clause, and a test double
is an object literal rather than a subclass or a mocking framework. If the
contract grows a member, both the factory and the double stop compiling.

| | `class` | factory |
| --- | --- | --- |
| Private state | `#field` | a local the closure captures |
| Detached method | loses `this` | works |
| Passed as a value | `new` is not callable | it *is* a function |
| Declares a contract | `implements Foo` | return type annotation |
| Test double | subclass or mock library | object literal |
| Per-instance cost | one shared prototype | one closure per method |

## Generic factories

A factory is where inference pays off most: the caller passes a value, and
every method on the returned object is typed from it.

<<< ../../examples/typescript/factories/generic-factories.ts

Two things to notice. `createStore` never needs a type argument at the call
site - `T` comes from `initial`, and flows into the parameter of the `update`
callback. And `const T` on `createNameSet` keeps the argument's literal types
alive, so a list of names becomes a union instead of decaying to `string[]`;
without it the factory could only ever promise `string`, and the type predicate
would narrow nothing.

::: tip Return the object, annotate the contract
Annotating the return type (`: Store<T>`) rather than letting it be inferred
is worth the extra characters: it checks the factory against the contract at
the definition, so an error points at the factory rather than at whichever
unlucky caller first used the missing member.
:::

## Dependencies are arguments

"Dependency injection" means passing a collaborator in rather than importing
it. A factory is the natural place: take the collaborators once, close over
them, return the API.

<<< ../../examples/typescript/factories/injecting-dependencies.ts

The dependency types describe the *smallest surface actually used* - `Clock` is
`{ now: () => Date }`, not the date library. This is what makes the production
wiring anticlimactic (`console` already satisfies `Logger`) and the test wiring
trivial (a frozen clock is one object literal). Nothing is mocked, no module
registry is patched, and the service under test is the same code that runs in
production.

The parameter order in `formatMoney` is the same principle one level down:
put the slow-changing arguments first, and the partially applied function is
the one worth keeping.

## Ports, doubles, and the composition root

Scale that up and you get the arrangement most applications want: an interface
(a *port*) that callers depend on, factories that produce implementations of
it, and one place that decides which implementation is used.

<<< ../../examples/typescript/factories/repository-and-container.ts

`createInMemoryUserRepository` is not a mock - it is a real implementation of
the port, which is why tests that use it exercise the same service code as
production. And because the port is a type, the double cannot drift: add a
method to `UserRepository` and the fake fails to compile immediately.

The container is the whole of "DI framework" that most codebases need. No
decorators, no reflection metadata, no string tokens - just a function that
calls factories in dependency order, with the type derived from those factories
via `ReturnType<typeof …>` (see [Derive Types with `typeof`](./derive-types-with-typeof)).

::: tip Build the graph once, at the edge
The composition root belongs at the entry point - `main.ts`, the request
handler, the test's `beforeEach`. Everything below it receives what it needs
and constructs nothing global, which is what keeps the tests independent.
:::

## A registry of factories

When *what to build* is described by data - a config file, a JSON payload, a
plugin manifest - choosing the constructor becomes a lookup. Keying that lookup
off a discriminated union turns "did we forget one?" into a compile error.

<<< ../../examples/typescript/factories/factory-registry.ts

Adding a member to `WidgetSpec` breaks the `widgetFactories` literal until its
factory exists, which is the same guarantee the
[exhaustive `switch`](./exhaustive-checks-with-never) gives, in table form.

::: warning The dispatch line that everyone gets wrong
The obvious implementation does not compile, and the error is baffling the
first time:

```ts
// ❌ Argument of type 'WidgetSpec' is not assignable to parameter of type 'never'.
//    The intersection '… & … & …' was reduced to 'never' because property
//    'kind' has conflicting types in some constituents.
function createWidget(spec: WidgetSpec): Widget {
  return widgetFactories[spec.kind](spec);
}
```

Indexing with a union key produces a **union of function types**, and calling a
union requires an argument assignable to the *intersection* of their parameters
- which for a discriminated union is `never`. The generic signature in the
example fixes it by tying the spec's `kind` to the same `K` the factory was
registered under; a plain `switch` also works. The
[visitor section](./design-patterns#visitor-a-union-and-a-function) generalises
this into a reusable `match` helper.
:::

## When a class is still right

Factories are the default, not the rule. Reach for `class` when:

| Situation | Why |
| --- | --- |
| Thousands of instances | Methods live once on the prototype; a factory allocates a closure per method per instance. |
| Subclassing `Error` | `instanceof` checks and stack traces depend on the prototype chain. |
| A framework demands it | React class components, TypeORM entities, Angular services, `extends HTMLElement`. |
| `instanceof` is part of the API | Structural typing cannot express "this exact constructor". |
| Public inheritance is genuinely the model | Rare - but when a library exposes a base class to extend, extend it. |

The measurement matters more than the rule: "one closure per method" only
becomes real memory when instances are numerous and short-lived. For the
service objects, repositories, and stores that make up most application code,
there is one of each.

## Summary

- A factory is a function returning an object; the closure holds the state and
  there is no `this` to lose.
- Annotate the return type so the contract is checked at the factory, not at
  the call site.
- Let generics flow from the arguments - callers should never need to write a
  type argument - and use `const` type parameters to preserve literals.
- Dependencies are parameters. Type them as the smallest surface used, and the
  test double becomes an object literal.
- Depend on a port, implement it with factories, and wire the graph in one
  composition root typed with `ReturnType<typeof …>`.
- Key a factory registry off a discriminated union so a new variant cannot be
  forgotten - and remember that dispatching on that key needs a generic
  signature, a `switch`, or a `match` helper.
- Use a class for prototype-shared methods at scale, `instanceof`, `Error`
  subclasses, and frameworks that require one.
