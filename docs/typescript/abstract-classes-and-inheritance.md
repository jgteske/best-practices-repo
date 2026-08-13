# Abstract Classes & Inheritance

Inheritance is the tightest coupling the language offers: a subclass depends on
the base class's *implementation*, not just its shape. That buys one thing an
interface cannot - a base that owns state and **controls the order of
operations** - and costs a hierarchy that is hard to change later.

Use it when the base genuinely owns a sequence. Reach for an interface plus a
function when it does not.

## Abstract classes: a partial implementation with holes

`abstract` on a class means it cannot be constructed. `abstract` on a member
means "no implementation here; a concrete subclass must supply one". Together
they express the **template method** pattern: a concrete method owns the
sequence, and the abstract members are the steps.

<<< ../../examples/typescript/classes/abstract-classes.ts{1-99}

Three things are doing work here:

- **`run()` is the only public entry point.** Callers cannot reorder the steps,
  skip validation, or forget to count. That guarantee is the reason to prefer an
  abstract class over an interface.
- **The steps are `protected`.** The public API is one method; the extension
  points are visible only to subclasses.
- **`isValid` is a hook, not an abstract member.** It has a default, so
  overriding is optional - which is exactly the difference between "you may
  customize this" and "you must supply this".

::: tip Abstract classes are still types
`Importer` cannot be `new`ed, but it is a perfectly good annotation:
`function describe(target: Importer)` accepts any concrete subclass. What you
cannot do is call `new` on `typeof Importer` - a factory that must actually
build something needs a concrete construct signature.
:::

<<< ../../examples/typescript/classes/abstract-classes.ts{101-145}

| Question | Answer |
| --- | --- |
| Type of any importer instance | `Importer` |
| Type of a concrete importer class | `new (...args) => Importer` |
| Type that also accepts the abstract class | `abstract new (...args) => Importer` |
| The class object, statics included | `typeof CsvImporter` |

`abstract new` exists for the cases where you only need to *reference* the
constructor - a registry of base classes, or a
[mixin applied to an abstract base](./mixins-and-class-factories#mixing-into-an-abstract-base).

### Abstract class or interface?

| Use an interface when | Use an abstract class when |
| --- | --- |
| There is no shared code | The base owns state or a fixed sequence |
| Implementations are unrelated | Implementations are variations of one thing |
| Test doubles should be object literals | Subclasses genuinely need `super` |
| A factory function could satisfy it | A framework requires a base class |

If the base class has no fields and no concrete methods, it is an interface that
costs a runtime import.

## `super()`, `super.method()`, and subclassing `Error`

In a derived class, `super(...)` is what creates the instance, so it must run
before `this` is touched. `super.method()` continues the lookup at the base
prototype instead of recursing.

<<< ../../examples/typescript/classes/inheritance-and-override.ts{1-46}

Subclassing `Error` is one of the places a class beats a factory outright:
`instanceof` and the stack trace both come from the prototype chain, and
`cause` (ES2022) keeps the original error instead of flattening it into a
string. Set `name` explicitly - `Error` sets it to `"Error"`, and the stack's
first line is what everybody reads first.

::: warning Only on old targets
With `target: ES5`, TypeScript's emit breaks the prototype chain for builtin
subclasses and `instanceof` silently returns `false`; the fix is
`Object.setPrototypeOf(this, new.target.prototype)` in the constructor. This
repo targets ES2022, where `extends Error` simply works.
:::

For expected failures that callers are meant to handle, an error class is often
the wrong shape entirely - put the failure in the return type instead, as
[Error Handling & Result Types](./error-handling) describes.

## `override` is not decoration

This repo compiles with `noImplicitOverride`, so the keyword is mandatory - and
it earns its place the day somebody renames a base method. Without it, an
override silently becomes a brand-new method that nobody calls. With it, the
subclass fails to compile:

```
This member cannot have an 'override' modifier because it is not declared
in the base class 'Repository'.
```

<<< ../../examples/typescript/classes/inheritance-and-override.ts{48-128}

What an override may change:

| Change | Allowed? |
| --- | --- |
| Widen visibility (`protected` → public) | ✅ |
| Narrow visibility (public → `private`) | ❌ |
| Narrow the return type | ✅ |
| Narrow a parameter type | ⚠️ allowed, and unsound |
| Add a required parameter | ❌ |

That "unsound" row is method parameter **bivariance**: a variable typed as the
base class can hold a subclass instance, so an override that accepts less than
the base promised will type-check and then fail. Declaring the member as a
property (`greet: (name: string) => string`) makes the check strict, and is
worth doing on any base class meant for extension.

## The trap: a constructor calling an overridable method

Subclass field initializers run **after** `super()` returns. So a method called
from the base constructor runs before the subclass exists:

<<< ../../examples/typescript/classes/inheritance-and-override.ts{130-174}

With a public field the override sees `undefined` while the type says `string`.
With a `#private` field it is worse - reading it before its initializer has run
throws a `TypeError`. The [JavaScript page](/javascript/classes-at-runtime)
prints the real ordering, step by step.

The fix is never to call an overridable method from a constructor. Expose an
explicit `init()`/`mount()`, or a static factory that constructs first and then
calls.

## Keep the chain shallow

Two levels is usually the honest maximum. Past that, "which class does this
method actually come from" stops being answerable without reading all of them -
and the answer is usually a collaborator that should have been passed in. See
[Factory Functions](./factory-functions) for the version of a class hierarchy
that is just a function taking a dependency, and
[Mixins & Class Factories](./mixins-and-class-factories) for composing behaviour
without a deeper chain.

## Summary

- An abstract class earns its place when it owns state or a fixed sequence;
  otherwise an interface says the same thing with less coupling.
- Make the template method public and the steps `protected`. A hook has a
  default; an abstract member does not.
- `abstract new (...) => T` references an abstract constructor; `new (...) => T`
  is required to actually build one.
- `super(...)` before `this`; set `name` when subclassing `Error`, and use
  `cause` to keep the original.
- `override` catches renamed base members. Parameter narrowing compiles but is
  unsound - declare the member as a property to make it strict.
- Never call an overridable method from a constructor: subclass fields do not
  exist yet.
