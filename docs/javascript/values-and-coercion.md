# Values, Types & Coercion

JavaScript has seven primitive types and one everything-else type. Most of the
language's reputation for surprises comes from three places: implicit conversion
between those types, the fact that objects are handled by reference, and the
fact that every number is a float. Once you can predict all three, very little
else is genuinely weird.

## Primitives and objects

| Category | Types | Behaviour |
| --- | --- | --- |
| Primitive | `string`, `number`, `bigint`, `boolean`, `undefined`, `symbol`, `null` | Immutable. Assigned and compared **by value**. |
| Object | everything else - `{}`, `[]`, functions, `Date`, `Map`, class instances | Mutable. Assigned and compared **by reference**. |

`typeof null === "object"` is a bug from the first version of JavaScript that
can never be fixed without breaking the web. Check for it with `x === null`, or
`x == null` when you want "null or undefined".

## Equality: use `===`

`==` converts its operands to a common type before comparing, following a
conversion table nobody remembers correctly. `===` never converts.

<<< ../../examples/javascript/language/values-and-coercion.mjs{js}

Running it prints:

```
== coercion surprises:
  0 == '' ............ true
  0 == '0' ........... true
  '' == '0' .......... false
  [] == false ........ true
  null == undefined .. true
  null == 0 .......... false
```

`0 == ""` and `0 == "0"` are both true, but `"" == "0"` is false - because the
first two convert a string to a number while the third compares two strings
directly. That inconsistency is the argument against `==` in a nutshell.

::: tip The one `==` worth keeping
`x == null` is true for exactly `null` and `undefined` and nothing else. Many
teams allow it as a deliberate exception (ESLint's
[`eqeqeq`](https://eslint.org/docs/latest/rules/eqeqeq) rule has a
`"smart"`/`null: "ignore"` option for precisely this).
:::

## Negation: `!`, `!!`, `!=` and `!==`

`!x` asks a single question - "is `x` falsy?" - by converting to boolean and
flipping. `!!x` converts without flipping, which makes it exactly `Boolean(x)`
in two characters. Neither one looks at the type: `!!"0"`, `!![]` and `!!{}` are
all `true`, because only the eight falsy values below produce `false`.

```
! and !!:
  0           !x -> true  !!x -> false
  ""          !x -> true  !!x -> false
  "0"         !x -> false !!x -> true
  []          !x -> false !!x -> true
  {}          !x -> false !!x -> true
  null        !x -> true  !!x -> false
  undefined   !x -> true  !!x -> false
  NaN         !x -> true  !!x -> false
  "hi"        !x -> false !!x -> true
```

That is why `if (!retries)` is a bug when `0` is a legal value: it puts a
deliberate `0` (or `""`) on the "missing" branch. Test for absence with
`retries == null`, and keep `!x` for cases where truthiness really is the
question.

`!=` and `!==` are just the negations of `==` and `===`, and inherit their
behaviour exactly - `!=` converts, `!==` does not:

```
!= vs !==:
  0 / ""            != -> false !== -> true
  "" / "0"          != -> true  !== -> true
  null / undefined  != -> false !== -> true
  1 / true          != -> false !== -> true
  NaN / NaN         != -> true  !== -> true
```

`0 != ""` is `false` because `==` converted the string to a number first, and
`NaN` differs from itself under both operators. Use `!==` everywhere, with the
same deliberate exception as before: `x != null` is "neither null nor
undefined", where `x !== null` would let `undefined` through.

| Form | Converts? | Use it for |
| --- | --- | --- |
| `!x` | yes, to boolean | "is this falsy" - never for "is this missing" |
| `!!x` | yes, to boolean | same as `Boolean(x)`; prefer `filter(Boolean)` |
| `!=` | yes, `==` rules | only as `x != null` |
| `!==` | no | everything else |

::: tip
`Boolean(x)` reads better than `!!x` when the conversion itself is the point -
building a flag, returning from a predicate, or filtering
(`values.filter(Boolean)`). Save `!x` for conditions, where the negation is
what you actually mean.
:::

## `null` vs `undefined`

Both mean "no value", and the distinction that survives contact with real code
is about *who* left it empty:

| | Means | Produced by |
| --- | --- | --- |
| `undefined` | the value was never set | missing properties, missing arguments, a `return` with no value, uninitialised `let` |
| `null` | something explicitly set it to empty | your own code, `JSON.parse('{"a":null}')`, most database drivers for SQL `NULL` |

Two consequences worth knowing: a default parameter value fires for `undefined`
but **not** for `null`, and `JSON.stringify` drops `undefined` properties while
keeping `null` ones.

```js
const f = (x = "default") => x;
f(undefined);                        // "default"
f(null);                             // null - defaults do not trigger

JSON.stringify({ a: undefined, b: null }); // '{"b":null}'
```

## Truthiness, `||` and `??`

Exactly eight values are falsy - `false`, `0`, `-0`, `0n`, `""`, `null`,
`undefined`, `NaN`. Everything else is truthy, **including `[]` and `{}`**.

That is why `||` and `??` are different operators and not stylistic variants:

```js
const port = userPort || 3000;   // 0 is falsy    -> a deliberate 0 becomes 3000
const port = userPort ?? 3000;   // 0 is not null -> a deliberate 0 survives
```

Use `??` for "fall back when absent" and reserve `||` for genuine boolean logic.
The same distinction applies to the assignment forms `||=` and `??=`.

## `NaN` and `Object.is`

`NaN` is the only value not equal to itself, which is how `Number.isNaN` used to
be implemented. Two rules:

- Use **`Number.isNaN(x)`**, never the global `isNaN(x)`. The global one coerces
  first, so `isNaN("hello")` is `true` - it is really asking "is this not a
  number *after conversion*".
- Use **`Object.is(a, b)`** when you need to distinguish `0` from `-0`, or treat
  `NaN` as equal to itself. It is `===` with those two corners fixed.

## Numbers are floats

Every `number` is an IEEE-754 double. Two failure modes follow:

```
  0.1 + 0.2 .................. 0.30000000000000004
  0.1 + 0.2 === 0.3 .......... false
  MAX_SAFE_INTEGER ........... 9007199254740991
  2**53 === 2**53 + 1 ........ true      <- the +1 rounds away
  Number(9007199254740993n) .. 9007199254740992   <- lost
```

- **Decimals**: compare with a tolerance (`Math.abs(a - b) < Number.EPSILON`)
  rather than `===`.
- **Money**: store integer minor units (cents) and divide only when formatting,
  or use a decimal library. Never a float.
- **Large integers**: past `Number.MAX_SAFE_INTEGER` (2⁵³−1), consecutive
  integers stop being distinguishable. Database IDs and Twitter-style snowflakes
  live above that line, which is why they arrive as strings from JSON APIs -
  `JSON.parse` on a raw 64-bit integer silently mangles it. Use `BigInt` (`123n`)
  when you need exact large integers, but note it will not mix with `number` in
  arithmetic without an explicit conversion.

## Copying: reference, shallow, deep

```
  original.name ............ mutated  <- reference assignment, one object
  original.nested.retries .. 99       <- spread shared the nested object
  deep.nested.retries ...... 0        <- structuredClone is independent
```

| Technique | Depth | Notes |
| --- | --- | --- |
| `const b = a` | none | Two names, one object. Mutating through either is visible to both. |
| `{ ...a }` / `Object.assign({}, a)` | one level | Nested objects and arrays are still shared. |
| `structuredClone(a)` | full | Handles `Map`, `Set`, `Date`, `RegExp`, typed arrays, and cycles. Throws on functions; loses class identity. |
| `JSON.parse(JSON.stringify(a))` | full-ish | Silently destroys `Date` (becomes a string), `Map`, `Set`, `undefined`, and `BigInt` (throws). Avoid. |

`structuredClone` is built in since Node 17 and needs no dependency. Reach for a
library's `cloneDeep` only when you need class instances preserved.

::: warning Frozen is not deep either
`Object.freeze` prevents writes to the object's own properties and stops there -
`config.nested.timeout = 5000` still goes through. See
[Objects & Classes](./objects-and-classes) for the demonstration.
:::

## Summary

- Use `===` everywhere; allow `x == null` only as a deliberate null-or-undefined
  check.
- `!x` and `!!x` only ask about truthiness - `!!"0"` and `!![]` are `true`, and
  `!x` misreports a legitimate `0` as missing. `!=`/`!==` negate `==`/`===` with
  the same conversion rules.
- `undefined` is "never set", `null` is "explicitly empty" - and only `undefined`
  triggers a default parameter.
- `??` falls back on null/undefined; `||` falls back on any falsy value,
  including `0` and `""`.
- `Number.isNaN`, not `isNaN`. `Object.is` when `-0` or `NaN` matter.
- Numbers are floats: money in integer cents, big IDs as strings or `BigInt`,
  decimals compared with a tolerance.
- Assignment shares, spread copies one level, `structuredClone` copies
  everything.
