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
