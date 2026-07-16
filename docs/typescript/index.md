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

| Page | Focus |
| --- | --- |
| [Event Listeners with Classes](./event-listeners-with-classes) | Correct `this` binding for handlers, bulk cleanup with `AbortController`, and strongly-typed custom event emitters. |
| [Derive Types with `typeof`](./derive-types-with-typeof) | Using `ReturnType`, `Parameters`, `Awaited`, and plain `typeof` to derive types from real functions and values instead of hand-writing types that can drift out of sync. |
| [Exhaustive Checks with `never`](./exhaustive-checks-with-never) | Making the compiler fail the build when a union/enum grows a new member and a `switch` wasn't updated to match. |
| [Type-Safe Validation](./type-safe-validation) | Type guards, branded/nominal types, and `satisfies` for validating `unknown` data and enum-like values without losing precision. |
| [General Best Practices](./general-best-practices) | `strict` mode, `unknown` vs `any`, `readonly`/`as const`, utility types, generic constraints, discriminated unions, naming and module organization. |

</div>

## How to use this guide

Each page follows the same shape: the problem, an anti-pattern (what goes
wrong without the practice), the recommended pattern with a full working
example, and a short summary you can skim later as a reminder. The pages
are independent - jump straight to whichever topic is relevant.
