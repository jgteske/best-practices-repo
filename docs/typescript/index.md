# TypeScript Best Practice Patterns

This guide focuses on patterns where TypeScript's type system can do more
work than it's usually given credit for - not just "add type annotations,"
but using the compiler to make entire categories of bugs impossible to
ship. Every code sample on these pages is a real, `strict`-mode
type-checked `.ts` file under [`examples/typescript`](https://github.com/jgteske/best-practices-repo/tree/main/examples/typescript)
in this repository, imported directly into the page - so the code you read
here is guaranteed to actually compile.

## What's covered

<div class="vp-doc">

**Modeling & Types**

| Page | Focus |
| --- | --- |
| [Make Illegal States Unrepresentable](./modeling-with-unions) | Discriminated unions and state machines that make bad states impossible to type, so they need no runtime checks. |
| [Derive Types with `typeof`](./derive-types-with-typeof) | Using `ReturnType`, `Parameters`, `Awaited`, and plain `typeof` to derive types from real functions and values instead of hand-writing types that drift. |
| [Const Assertions & Enum Alternatives](./const-assertions-and-enums) | `as const` for literal/`readonly` inference, and the recommended `as const` object over native `enum`. |
| [Template Literal Types](./template-literal-types) | Giving strings real structure - typed ids, generated combinations, and route params parsed at the type level. |

**Type-Level Programming**

| Page | Focus |
| --- | --- |
| [Generics In-Depth](./generics-in-depth) | Inference over explicit type args, minimal constraints, and conditional types with `infer`. |
| [Mapped & Conditional Types](./mapped-and-conditional-types) | Building your own utility types with key remapping, modifiers, and recursion. |
| [Function Signatures & Overloads](./function-signatures) | Union params vs overloads vs conditional returns, and assertion signatures. |

**Classes**

| Page | Focus |
| --- | --- |
| [Classes, Fields & Constructors](./classes-and-constructors) | `readonly`/`private`/`#private`, parameter properties and the ordering trap they hide, `!` and `declare`, constructor overloads vs named static factories, accessors and `static` blocks. |
| [Methods, `this` & Callers](./class-methods-and-callers) | Why a passed method loses `this`, the three fixes and what each costs, `this` parameters, and callbacks that pass more arguments than you expect. |
| [Abstract Classes & Inheritance](./abstract-classes-and-inheritance) | Template methods with `protected` steps, abstract construct signatures, `super` and `Error` subclasses, what `override` catches, and the constructor that calls an override too early. |
| [Classes with Interfaces & Types](./classes-with-interfaces) | `implements` as a check, when a class type turns nominal, typing the static side with `satisfies`, construct signatures, and generic classes. |
| [Chaining & Fluent Builders](./class-chaining-and-builders) | The `this` return type, `this` parameters and `this is T` guards, mutable vs immutable chains, and a type-state builder whose `build()` will not compile early. |
| [Mixins & Class Factories](./mixins-and-class-factories) | Functions that take a class and return a subclass, why the constructor type needs `any[]`, constrained and abstract bases, and functions whose product is a class. |

**Safety & Correctness**

| Page | Focus |
| --- | --- |
| [Exhaustive Checks with `never`](./exhaustive-checks-with-never) | Making the compiler fail the build when a union/enum grows a new member and a `switch` wasn't updated to match. |
| [Type-Safe Validation](./type-safe-validation) | Type guards, branded/nominal types, and `satisfies` for validating `unknown` data without losing precision. |
| [Error Handling & Result Types](./error-handling) | Putting expected failures in the return type with `Result<T, E>`, and narrowing `unknown` in `catch`. |

**Runtime Patterns**

| Page | Focus |
| --- | --- |
| [Event Listeners with Classes](./event-listeners-with-classes) | Correct `this` binding for handlers, bulk cleanup with `AbortController`, and strongly-typed custom event emitters. |
| [Async & Promise Patterns](./async-and-promises) | Avoiding floating promises, parallel vs sequential work, and choosing the right Promise combinator by its result type. |
| [Cancellation & AbortSignal](./cancellation-and-signals) | Threading a signal through async APIs, `AbortSignal.timeout`/`any`, cancel-the-previous-request, and cooperative `throwIfAborted` loops. |

**Design Patterns**

| Page | Focus |
| --- | --- |
| [Factory Functions](./factory-functions) | Closures instead of `this`, generic factories, dependencies as arguments, ports with in-memory doubles, a composition root, and factory registries keyed by a union. |
| [Design Patterns in TypeScript](./design-patterns) | Strategy, Decorator, Command, Visitor, Observer, Builder, Adapter and Singleton written the way the language wants them - mostly as functions, unions and records. |

**Files & Declarations**

| Page | Focus |
| --- | --- |
| [`.ts`, `.tsx` & `.d.ts`](./file-kinds-and-declarations) | What each file kind is for, the JSX-vs-generics trap in `.tsx`, ambient modules for untyped packages, and why script-mode declares while module-mode augments. |
| [Namespaces & Declaration Merging](./namespaces) | What a namespace is and what it compiles to, why modules replaced it, and the merging patterns that are still the right answer. |

**Reference**

| Page | Focus |
| --- | --- |
| [General Best Practices](./general-best-practices) | `strict` mode, `unknown` vs `any`, `readonly`/`as const`, utility types, generic constraints, naming and module organization. |

</div>

## How to use this guide

Each page follows the same shape: the problem, an anti-pattern (what goes
wrong without the practice), the recommended pattern with a full working
example, and a short summary you can skim later as a reminder. The pages
are independent - jump straight to whichever topic is relevant.
