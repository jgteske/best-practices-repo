# Python Basics

The core of the language on one page: how names and objects work, the built-in
types, collections, control flow, and functions. Each section is a region of a
runnable file under
[`examples/python/language`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/language).
Every `assert` in those files runs in CI, so each statement they make is checked.

::: tip Try it yourself
Every file runs on its own: `python3 values_and_names.py`. For quick
experiments, the interactive interpreter (`python3` with no arguments) is the
fastest feedback loop there is. `help(str.split)` and `dir(obj)` work there too.
:::

## Names and objects

This model explains more Python surprises than anything else: **a variable is a
name bound to an object**. Assignment binds another name to the same object. It
never copies.

<<< ../../examples/python/language/values_and_names.py#names

```
scores after alias.append: [90, 72, 100]
```

`is` asks "same object?", `==` asks "equal value?". Use `is` only for singletons:
`None`, `True`, `False`, and sentinel objects you created yourself.

## Mutability

Some types can be changed in place, others cannot. The difference matters
whenever two names share an object.

<<< ../../examples/python/language/values_and_names.py#mutability

| Immutable | Mutable |
| --- | --- |
| `int`, `float`, `bool`, `str`, `bytes`, `tuple`, `frozenset`, `None` | `list`, `dict`, `set`, `bytearray`, most class instances |

Only immutable (more exactly, *hashable*) values can be `dict` keys or `set`
members. That is one reason to reach for a `tuple` rather than a `list` for a
fixed-shape record.

### Copying

<<< ../../examples/python/language/values_and_names.py#copying

A shallow copy duplicates the outer container and shares everything inside it.
Reach for `copy.deepcopy` only when you really need independent nested data.
Deep copies are slow and rarely what you need. Building a new value is usually
clearer.

## Truthiness and numbers

<<< ../../examples/python/language/values_and_names.py#truthiness

::: warning `x or default` replaces valid falsy values
`retries or 3` turns an explicit `0` into `3`. When `0`, `""` or `[]` are
legitimate values, compare against `None` explicitly.
:::

<<< ../../examples/python/language/values_and_names.py#equality

`int` has arbitrary precision, so it never overflows. `/` always returns a
`float`, and `//` floors toward negative infinity, so `-7 // 2` is `-4`, not
`-3` as in C or Java. For money, use integer cents or `decimal.Decimal`, never
`float`.

## Strings

<<< ../../examples/python/language/strings_and_collections.py#strings

f-strings are the formatting tool to use. `%` formatting and `str.format` still
work, but f-strings are shorter and faster. The `=` specifier (`f"{price=}"`) is
the quickest debug print there is.

::: warning `strip`, `lstrip`, `rstrip` take a *set of characters*
`"report.csv".rstrip(".csv")` removes any trailing `.`, `c`, `s` and `v`
characters, so `"docs.csv".rstrip(".csv")` returns `"do"`. Use `removesuffix` /
`removeprefix` (3.9+) to remove an exact string.
:::

## The four collections

<<< ../../examples/python/language/strings_and_collections.py#collections

| Type | Ordered | Mutable | Duplicates | Lookup | Use for |
| --- | --- | --- | --- | --- | --- |
| `list` | yes | yes | yes | by index, O(1) | a sequence you add to |
| `tuple` | yes | no | yes | by index, O(1) | a fixed-shape record, a dict key |
| `dict` | insertion | yes | keys unique | by key, O(1) | mapping keys to values |
| `set` | no | yes | no | membership, O(1) | uniqueness, fast `in`, set algebra |

`x in some_list` scans the whole list. If you test membership in a loop, build a
`set` once.

### `collections`: the batteries

<<< ../../examples/python/language/strings_and_collections.py#stdlib-collections

`Counter`, `defaultdict` and `deque` (a fast double-ended queue) remove most
hand-written bookkeeping. For records, use a
[dataclass](./classes#dataclasses) rather than a `namedtuple` or a dict with
fixed keys.

## Unpacking

<<< ../../examples/python/language/strings_and_collections.py#unpacking

```
1. py
2. rs
```

Use `enumerate` instead of `range(len(items))`, and `zip` instead of indexing
two lists in parallel. Pass `strict=True` to `zip` whenever the inputs are meant
to be the same length. A silent truncation is a bug you never see.

## Comprehensions

<<< ../../examples/python/language/strings_and_collections.py#comprehensions

A comprehension is for *building* a collection. If the body has side effects, or
needs more than one `if` and one `for`, write a normal loop. And use a generator
expression (parentheses, no brackets) when the result is consumed once, e.g. by
`sum`, `any`, `max` or `"".join`: it never builds the intermediate list.

## Control flow

<<< ../../examples/python/language/control_flow.py#if-and-loops

A `for`/`while` loop's `else` block runs when the loop finishes *without*
`break`. It is the idiomatic way to say "searched everything, found nothing".

### `match` (3.10+)

`match` is structural pattern matching, not a C `switch`. It destructures
sequences, mappings and objects, and binds names while doing it.

<<< ../../examples/python/language/control_flow.py#match

```
  None                                          -> nothing
  0                                             -> zero
  -3                                            -> negative int -3
  'hey'                                         -> text of length 3
  (1, 2)                                        -> pair 1, 2
  [1, 2, 3]                                     -> sequence starting 1 (+2)
  {'type': 'user', 'name': 'ada', 'id': 1}      -> user ada
  Point(x=0, y=0)                               -> origin
  Point(x=1, y=2)                               -> point at 1, 2
  4.5                                           -> something else
```

Cases are tried top to bottom. Sequence patterns never match `str`, and mapping
patterns ignore extra keys.

::: danger A bare name in a `case` captures, it does not compare
`case expected:` matches **anything** and rebinds `expected`. Compare against a
value with a guard, or with a dotted name such as `Status.ACTIVE`:

<<< ../../examples/python/language/control_flow.py#match-capture-pitfall
:::

### The walrus operator

<<< ../../examples/python/language/control_flow.py#walrus

## Functions

### Parameter kinds

<<< ../../examples/python/language/functions_basics.py#parameter-kinds

Everything before `/` is positional-only, and everything after `*` is
keyword-only. Keyword-only parameters are the most useful of the two. A call
like `connect("db", timeout=1)` explains itself, and you can reorder or add
keyword-only parameters without breaking callers. Make boolean flags and
optional settings keyword-only by default.

### The mutable default trap

<<< ../../examples/python/language/functions_basics.py#mutable-default

The default value is created once, when `def` runs, and shared by every call
that does not pass that argument. The fix is the `None` sentinel. Ruff's `B006`
rule flags the mistake. See [Tooling](./tooling).

### Closures

<<< ../../examples/python/language/functions_basics.py#closures

A nested function can *read* variables from the enclosing function. To *rebind*
one, it must declare it `nonlocal`, or `global` for module-level names, which
you should avoid. Closures capture **variables, not values**. All three lambdas
in the loop share one `i`, which holds `2` by the time they run.

### Decorators

A decorator is a function that takes a function and returns a replacement.
`@timed` above `def` is shorthand for `slow_add = timed(slow_add)`.

<<< ../../examples/python/language/functions_basics.py#decorators

Always use `functools.wraps` in a decorator. Without it, the wrapped function
loses its name, docstring and signature, and tracebacks, `help()` and test
reports get confusing. The `[**P, R]` in the signature keeps the decorator
type-safe. [Function Typing](./function-typing#typed-decorators) explains it.

## Style in one paragraph

Follow [PEP 8](https://peps.python.org/pep-0008/) and let a formatter enforce
it. The naming rules to remember are `snake_case` for functions, variables and
modules, `PascalCase` for classes, `UPPER_SNAKE` for constants, and a leading
`_` for "internal". Don't memorise the rest: run `ruff format` and
`ruff check`. [Tooling](./tooling) sets them up.
