# Methods, `this` & Callers

`this` is decided by the **call**, not by the definition. `obj.method()` binds
`this` to `obj`; every other call form - a detached reference, a callback, a
destructured method - does not. The compiler will not tell you, because
`stopwatch.tick` really is a `() => number` and it really is being called.

This is the single most common way class-based APIs break, and the reason
[factory functions](./factory-functions) are the default in this guide. When a
class is the right answer, the rules below make it safe.

## The failure, and the three fixes

<<< ../../examples/typescript/classes/this-binding-and-callers.ts{1-60}

| Approach | `this` correct? | Stable identity? | Cost |
| --- | --- | --- | --- |
| `obj.method()` | ✅ | ✅ one prototype method | none |
| `() => obj.method()` | ✅ | ❌ new arrow every time | an allocation per call site |
| `obj.method.bind(obj)` | ✅ | ✅ *if you keep the reference* | one bound function |
| arrow-function field | ✅ | ✅ it *is* the field | one closure per method **per instance** |

The identity column matters more than it looks: `removeEventListener`,
`off(handler)`, and any `Set` of callbacks compare by reference, so a fresh
arrow wrapper can never be unregistered. That is the argument for the arrow
field on anything used as a handler - and the reason
[Event Listeners with Classes](./event-listeners-with-classes) recommends it
outright.

The argument against is memory: an arrow field is a closure per instance, where
a method is one function shared by all of them. For a handful of controllers it
is irrelevant. For ten thousand model objects, it is the difference between one
function and ten thousand.

::: warning Every one of these compiles
```ts
setTimeout(stopwatch.tick, 0);
[1, 2, 3].forEach(stopwatch.tick);
button.addEventListener("click", stopwatch.tick);
const { tick } = stopwatch;
```
The moment a method is **passed** rather than **called**, it needs `.bind`, an
arrow wrapper, or to have been an arrow field all along.
:::

## Making the compiler see it: the `this` parameter

A first parameter named `this` is a type annotation, not a real parameter - it
is erased at compile time. It moves the requirement into the signature, so a
wrong call site becomes a compile error instead of a 3am stack trace.

<<< ../../examples/typescript/classes/this-binding-and-callers.ts{74-109}

Two payoffs beyond catching detached calls:

- **Typed framework callbacks.** `function handleClick(this: HTMLButtonElement,
  event: MouseEvent)` types the `this` a listener will be invoked with - no cast,
  no `any`.
- **`ThisParameterType` and `OmitThisParameter`** read that annotation back off
  a function type, which is what you need when wrapping or re-exporting one.

The same annotation is also how you make a *builder* method refuse to run too
early - see [Chaining & Fluent Builders](./class-chaining-and-builders#type-state-a-build-that-only-exists-once-it-is-legal).

## Callers that pass more arguments than you expect

`this`-loss usually arrives with a second bug attached. `map`, `forEach` and
`reduce` call their callback with `(value, index, array)`, so a method that
takes one optional second parameter silently receives the index:

<<< ../../examples/typescript/classes/this-binding-and-callers.ts{111-149}

Wrapping the call in an arrow fixes both problems at once, which is why it is
worth doing even when `this` is not involved.

## Static methods have a `this` too

Inside a `static` method, `this` is the class - so a destructured static loses
its receiver exactly like an instance method does. Referring to the class by
name (`Registry.#items`, not `this.#items`) removes the question entirely.

The exception is deliberate: `static create() { return new this(); }` uses
dynamic `this` so a subclass inherits a factory that builds *the subclass*. If
that is what you want, write it on purpose and annotate it.

## Summary

- The compiler cannot see `this`-loss. Passing a method as a value always needs
  `.bind`, an arrow wrapper, or an arrow field.
- Arrow field for handlers that must be unregistered; prototype method when
  instances are numerous.
- A `this` parameter turns the requirement into a compile error, and types
  callbacks a framework invokes with its own receiver.
- Wrap callbacks in an arrow so extra arguments (`index`, `array`) cannot leak
  into optional parameters.
- In a `static` method, `this` is the class - name the class explicitly unless
  you specifically want subclass dispatch.
