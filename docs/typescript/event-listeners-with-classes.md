# Event Listeners with Classes

Classes are a natural home for event-driven code: a widget owns some DOM
nodes, a service owns some async work, and both need to notify the outside
world when something happens. TypeScript adds two things on top of plain
JavaScript that are worth getting right: **`this` binding** and **typed
payloads**.

## Problem 1: `this` binding

A method reference passed directly to `addEventListener` loses its
connection to the instance it came from, because `addEventListener` calls
the function as `element.addEventListener_internals.call(element, event)`,
not as `instance.method(event)`.

<<< ../../examples/typescript/event-listeners/dom-widget.ts

### Why the arrow-function field wins

| Approach | `this` correct? | Same reference for `removeEventListener`? | Boilerplate |
| --- | --- | --- | --- |
| Plain method (`this.handleClick`) | ❌ no | ✅ yes | none, but broken |
| `.bind()` in constructor | ✅ yes | ✅ yes, if you store the bound function | one extra field per handler |
| Arrow function class field | ✅ yes | ✅ yes (it *is* the field) | none |

Arrow function class fields are initialized once per instance, in
declaration order, before the constructor body runs (after `super()` in a
subclass). Because arrow functions capture `this` lexically, the field is
already bound to the instance - there's no separate "bound" copy to manage,
and the same function identity is available for both `addEventListener` and
`removeEventListener`.

::: tip When to still use `.bind()`
If you support very old JS engines without class fields, or the codebase
predates the class-fields proposal being stage 4, `.bind()` in the
constructor is the equivalent fallback. Functionally it's the same trade-off.
:::

## Problem 2: cleaning up more than one listener

Tracking a `removeEventListener` call for every `addEventListener` call gets
unwieldy once a class owns several event types. `AbortController` lets a
single `.abort()` call remove every listener that was registered with its
`signal`:

<<< ../../examples/typescript/event-listeners/abort-controller-cleanup.ts

This pattern is a good default for anything with a clear lifecycle -
components, controllers, subscriptions - because "dispose" becomes a single
line no matter how many listeners were added.

## Problem 3: typed payloads for custom events

DOM events are one thing, but classes frequently need to emit their own
application events (`"user:created"`, `"job:failed"`, ...). A generic
`emit(name: string, data: any)` throws away all type safety at the exact
place bugs like to hide: the boundary between producer and consumer.

Instead, describe every event and its payload once, in an **event map**, and
build a small typed emitter around it:

<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts

With this shape:

- `on("user:created", ...)` autocompletes the event name from the map.
- The listener's parameter type is inferred from the map - no manual
  annotation, no `any`.
- Renaming or reshaping an event's payload is a compiler error everywhere
  that event is consumed, not a runtime surprise.
- `on()` returns an unsubscribe function, which avoids the same
  "keep a reference around just for `off()`" problem `removeEventListener`
  has.

## Summary

- Prefer **arrow-function class fields** for any method used as an event
  handler.
- Prefer **`AbortController`** over manual `removeEventListener` bookkeeping
  once a class registers more than one listener.
- Model custom events with an **event map** and a small generic emitter
  instead of stringly-typed `emit(name, data)` calls.
