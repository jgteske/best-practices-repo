# Scope, Closures & `this`

Three mechanisms, one page. Scope decides which names are visible, closures
decide how long a variable lives, and `this` is decided by the *call*, not the
definition - which is the one rule that catches everyone.

## `var`, `let`, `const`

<<< ../../examples/javascript/language/closures-and-this.mjs{js}

The first block prints:

```
scoping:
  var before its line .... undefined
  let before its line .... ReferenceError
  inside the block ....... let does not
  after the block ........ var ignores the block / undefined
```

| | Scope | Before its declaration | Redeclarable |
| --- | --- | --- | --- |
| `var` | the whole **function** | `undefined` | yes |
| `let` | the enclosing **block** | throws (temporal dead zone) | no |
| `const` | the enclosing **block** | throws (temporal dead zone) | no |

All three are hoisted. The difference is that `var` is *initialised* to
`undefined` at hoist time, while `let` and `const` sit in the **temporal dead
zone** until execution reaches their declaration - so a use-before-declare is a
loud `ReferenceError` instead of a quiet `undefined` that surfaces three
functions later.

**Default to `const`.** Use `let` when you genuinely reassign. There is no
remaining reason to write `var`.

::: tip `const` is not immutable
`const` means the *binding* cannot be reassigned. `const config = {}` still
allows `config.retries = 3`. For a value that must not change, freeze it (see
[Objects & Classes](./objects-and-classes)) - and remember freezing is shallow.
:::

## Closures

A function keeps a live reference to the scope it was **created** in, for as
long as the function itself is alive. That single sentence explains private
state, the loop-capture bug, and most accidental memory retention.

```
closures:
  independent counters .... 2 101
  var captured ............ 3, 3, 3
  let captured ............ 0, 1, 2
```

`makeCounter()` in the example returns two functions that share one `count`
which nothing else can reach. That is encapsulation without a class.

The `3, 3, 3` line is the classic bug: `var i` creates **one** binding shared by
every iteration, so all three closures read the same variable - which is `3` by
the time anyone calls them. `let j` creates a **fresh binding per iteration**,
so each closure captures its own. Before `let` existed, people worked around it
with an IIFE; now you just use `let`.

::: warning Closures keep things alive
A closure retains its entire enclosing scope, not only the variables it uses. A
long-lived callback that closes over a scope containing a 50MB buffer keeps that
buffer alive too. If a listener or an interval outlives the data it was created
next to, that is a leak - see
[memory considerations](/typescript/event-listeners-with-classes) for the
cleanup patterns.
:::

## `this`

`this` is not the function, not the module, and not lexical - it is whatever the
**call site** supplies:

| Call form | `this` is |
| --- | --- |
| `obj.method()` | `obj` - the thing left of the dot |
| `fn()` | `undefined` in strict mode / modules (the global object in sloppy mode) |
| `new Fn()` | the newly created instance |
| `fn.call(x)` / `fn.apply(x)` / `fn.bind(x)()` | `x` |
| arrow function | inherited from the enclosing scope **at definition time**; `.call` cannot change it |
| DOM/`addEventListener` handler | the element the listener is attached to |

```
this:
  method: ada
  arrow: undefined  <- no object; module-scope `this` is undefined in ESM
  nested arrow: ada
  method: undefined <- called with no receiver
  method: ada       <- .call / .apply / .bind restore it
```

The important pair in that output:

- **An arrow function as an object property is almost always a mistake.** It
  captures the *module's* `this`, not the object's, so `user.greetArrow()` sees
  `undefined`.
- **An arrow function inside a method is almost always right.** It inherits the
  method's `this`, which is why callbacks written as arrows just work:

```js
class Poller {
  #interval;
  start() {
    // arrow: `this` is still the Poller instance inside the callback
    this.#interval = setInterval(() => this.tick(), 1_000);
    // function: `this` would be the Timeout object - a classic TypeError
  }
}
```

### Losing `this`

Passing a method as a bare callback detaches it:

```js
element.addEventListener("click", counter.increment);  // `this` is the element
setTimeout(logger.flush, 1_000);                       // `this` is undefined
```

Three fixes, in order of preference:

1. **Wrap it in an arrow**: `() => counter.increment()`. Nothing to remember, and
   the intent is visible at the call site.
2. **Use a class field holding an arrow**: `increment = () => { ... }`. Bound to
   the instance for its whole life, so it survives being passed anywhere - at the
   cost of one function per instance rather than one per class.
3. **`.bind(this)` in the constructor.** The pre-class-fields idiom; still common
   in older React code.

The final block of the example runs both a bound field and a plain method as
bare callbacks:

```
  callback result ......... 1
  callback result ......... TypeError: unbound method
```

## Summary

- `const` by default, `let` when you reassign, never `var`.
- Hoisting is universal; the TDZ is what makes `let`/`const` fail loudly instead
  of quietly.
- A closure captures its whole enclosing scope and keeps it alive - useful for
  private state, a leak when a listener outlives its data.
- `let` in a loop gives one binding per iteration; `var` gives one, shared.
- `this` comes from the call site. Arrows capture it lexically and cannot be
  rebound - which makes them right inside methods and wrong as methods.
