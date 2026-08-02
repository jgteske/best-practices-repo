# Arrays, Iteration & Collections

Array methods, the destructuring syntax that makes them readable, the two keyed
collections that are not objects, and the protocol underneath `for...of` that
lets you write your own lazy sequences.

<<< ../../examples/javascript/language/iteration-and-collections.mjs{js}

## Choosing an array method

| You want | Method | Returns |
| --- | --- | --- |
| One output per input | `map` | new array, same length |
| A subset | `filter` | new array |
| One value from many | `reduce` | anything |
| The first match | `find` / `findIndex` / `findLast` | element / index / `undefined` |
| A yes-or-no answer | `some` / `every` | boolean |
| Map, then flatten one level | `flatMap` | new array |
| Grouped buckets | `Object.groupBy` / `Map.groupBy` | object / `Map` |
| Just to do something per item | `for...of` | nothing |

Two rules that prevent most array bugs:

**Always pass `reduce` an initial value.** Without one it uses element 0 as the
seed and throws `TypeError` on an empty array - a bug that only appears in
production, on the day a list is empty.

**Do not use `forEach` when you mean something else.** You cannot `break` out of
it, and it ignores the promise returned by an `async` callback - see
[the event loop page](./event-loop-and-async) for what that costs you. If you
need early exit or `await`, use `for...of`.

::: tip A method chain is not automatically better
`.filter().map().slice()` allocates an intermediate array per step. For small
collections that is irrelevant and the chain reads beautifully. For a hot loop
over a large array - or any loop that wants to stop early - a plain `for...of`
is both clearer and faster. Pick per site, not per religion.
:::

## Mutating vs copying

`sort`, `reverse`, `splice`, `push`, `pop`, `shift`, `unshift`, and `fill`
mutate in place. The ES2023 additions do the same job and return a copy:

| Mutates | Copies |
| --- | --- |
| `arr.sort(cmp)` | `arr.toSorted(cmp)` |
| `arr.reverse()` | `arr.toReversed()` |
| `arr.splice(i, n, x)` | `arr.toSpliced(i, n, x)` |
| `arr[i] = x` | `arr.with(i, x)` |

```
mutation:
  toSorted copy ..... 10, 20, 30
  original intact ... 30, 10, 20
  sort mutated ...... 10, 20, 30
  at(-1) ............ 30
  [10, 9].sort() .... 10, 9  <- lexicographic!
```

That last line is the trap worth memorising: **the default sort compares
strings.** `[10, 9].sort()` gives `[10, 9]` because `"10" < "9"`. Always pass a
comparator for numbers: `.sort((a, b) => a - b)`.

`arr.at(-1)` gets the last element with no `length - 1` arithmetic.

## Destructuring, spread, rest

```
destructuring:
  array + rest ...... 1 then 3 more
  rename + default .. ada 120 default
  parameter object .. localhost:6379 {"tls":true}
  spread merge ...... {"retries":3,"verbose":true}
```

- **Rename and default together**: `const { total: amount, missing = "x" } = obj`.
  A default fires only for `undefined`, never for `null`.
- **Destructure in the parameter list** for an options object, with `= {}` on the
  whole thing so calling with no arguments works:
  `function connect({ host = "localhost", ...rest } = {})`.
- **Spread merges, later wins**: `{ ...defaults, ...overrides }`. One level deep,
  like every other spread.
- **Rest collects the remainder**: `const [first, ...others] = list`, or
  `const { id, ...withoutId } = record` to omit a key.

## `Map`, `Set`, and the weak variants

```
collections:
  Map size / get .... 3 165
  Map iterates in insertion order: ada, grace, alan
  object as a key ... identity, not string
  plain object key .. [object Object]  <- stringified
  Set dedupes ....... shipped, pending, cancelled
```

| | Keys | Order | Size | Iterable |
| --- | --- | --- | --- | --- |
| `{}` | strings & symbols only | insertion, but integer-like keys sort first | `Object.keys(o).length` | via `Object.entries` |
| `Map` | **any value**, by identity | insertion, always | `.size` | directly |
| `Set` | values, deduplicated by identity | insertion | `.size` | directly |

Reach for `Map` when keys are data rather than code - user IDs, objects, mixed
types - or when you add and delete a lot. Reach for `Set` when you mean "a
collection of unique things" and want `O(1)` `has`.

`WeakMap` and `WeakSet` hold their keys weakly: when the key object is garbage
collected the entry disappears. That is the correct way to attach metadata to an
object you do not own - a cache keyed by request object, say - without pinning it
in memory forever. They are not iterable, by design.

::: warning Identity, not equality
`Set` and `Map` compare with SameValueZero - which is `===` except `NaN` equals
itself. `new Set([{a:1}, {a:1}])` has **two** entries, because those are two
different objects. To dedupe by content, key on something stable like an `id` or
a serialised form.
:::

## The iterator protocol

Anything with a `[Symbol.iterator]` method works in `for...of`, spread, and array
destructuring. That is the whole contract, and generators are the easy way to
satisfy it:

```
iterators:
  lazy take from an infinite sequence: 1, 2, 3, 4, 5
  custom iterable ... intro + 2 more
  entries() gives index pairs: 0:a 1:b
```

`function*` returns a generator: calling it runs nothing, and each `yield`
suspends until the consumer asks for the next value. That laziness is what lets
`naturals()` be an infinite sequence that `take(…, 5)` can safely consume, and
what makes generators the natural fit for paging an API or walking a large file
- see [async iterators](./event-loop-and-async#async-iterators) for the
`await`-able version.

`yield*` delegates to another iterable, which is how the `Playlist` class in the
example exposes its private array without handing out a mutable reference to it.

## Summary

- Match the method to the intent; `reduce` always takes an initial value.
- `forEach` cannot `break` and ignores `async` callbacks - use `for...of`.
- `sort` mutates and compares strings by default; `toSorted` with a comparator
  is usually what you meant.
- Destructure options objects in the parameter list, with `= {}` for the
  no-argument call.
- `Map`/`Set` for data-shaped keys and uniqueness; `WeakMap` to attach metadata
  without retaining the key.
- `[Symbol.iterator]` is the whole protocol, and `function*` is the shortest way
  to implement it.
