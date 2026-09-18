# Function Typing

Type hints describe what a function accepts and returns. Python **ignores them
at runtime**. A checker such as mypy or pyright reads them and rejects wrong
calls before the code runs. Every example on this page passes `mypy --strict`.
Every `<- mypy:` comment quotes the error mypy really reports when that line is
uncommented, and `npm run check:python` re-checks each one.

::: tip The one-sentence rule
**Accept the most general type you can work with, and return the most specific
type you have.** Most of this page applies that rule.
:::

## The everyday annotations

<<< ../../examples/python/type_hints/annotations_basics.py#basic-annotations

- Annotate every parameter and the return type, including `-> None`. Under
  `--strict`, a function without annotations is an error, and an unannotated
  function's body is not checked at all by default.
- Use the builtin types directly: `list[int]`, `dict[str, int]`,
  `tuple[int, ...]`. The `List`, `Dict` and `Optional` imports from `typing`
  are legacy.
- Leave local variables unannotated. mypy infers them. Annotate a local only
  when it starts empty (`items: list[str] = []`) or when inference picks a
  type that is too narrow.

## Values that may be missing: `X | None`

<<< ../../examples/python/type_hints/annotations_basics.py#optional

`str | None` forces every caller to handle the `None` case, and the checker
tracks the narrowing through `if x is None: return`, `isinstance`, `assert`, and
early returns. This one feature catches more real bugs than the rest of the type
system put together.

## Parameters: abstract. Returns: concrete.

<<< ../../examples/python/type_hints/annotations_basics.py#abstract-params

| Instead of this parameter type | Accept | Because |
| --- | --- | --- |
| `list[T]` you only iterate | `Iterable[T]` | generators, sets, dict keys and files all work |
| `list[T]` you index or `len()` | `Sequence[T]` | tuples, ranges and strings work, and the signature says you won't mutate it |
| `dict[K, V]` you only read | `Mapping[K, V]` | read-only, and it is *covariant* (see below) |
| `set[T]` you only test `in` | `Collection[T]` or `AbstractSet[T]` | frozensets and dict views work |
| a class you only call one method on | a `Protocol` | any object with that method works, see [below](#protocols) |

Import these from `collections.abc`, not `typing`.

::: details Why `list[int]` is not a `list[float]` (variance)
A function that takes `list[float]` may *append* a float. If you passed it your
`list[int]`, your list would now hold a float. mypy rejects the call because
`list` is **invariant**. `Sequence` and `Mapping` are read-only, so they can be
**covariant**: a `Sequence[int]` *is* a `Sequence[float]`. mypy even suggests
the fix:

```
error: Argument 1 to "append_half" has incompatible type "list[int]"; expected "list[float]"  [arg-type]
note: "list" is invariant -- see https://mypy.readthedocs.io/en/stable/common_issues.html#variance
note: Consider using "Sequence" instead, which is covariant
```
:::

## Type aliases

<<< ../../examples/python/type_hints/annotations_basics.py#aliases

The `type` statement (3.12+) is evaluated lazily, so an alias can refer to
itself (`Json`) or to classes defined later in the file. It replaces
`TypeAlias` and plain `X = ...` assignments.

## Functions as values: `Callable`

<<< ../../examples/python/type_hints/annotations_basics.py#callables

`Callable[[int], int]` means "called with one `int`, returns an `int`".
`Callable[[], str]` takes no arguments, and `Callable[..., None]` gives up on
the arguments entirely. `Callable` cannot express keyword arguments, defaults or
overloads. When you need those, write a `Protocol` with a `__call__` method.

## `*args` and `**kwargs`

<<< ../../examples/python/type_hints/annotations_basics.py#args-kwargs

The annotation on `*args` / `**kwargs` is the type of **each element**, not of
the tuple or dict. To accept a fixed set of keyword arguments with different
types, describe them with a `TypedDict` and `Unpack`. The checker then
validates the names as well.

## `Any` vs `object`

<<< ../../examples/python/type_hints/annotations_basics.py#any-vs-object

`Any` turns type checking off for everything it touches, and the loss spreads
through every value derived from it. `object` is the safe "could be anything":
you must narrow it with `isinstance` before you use it. Use `object` for
parameters that accept anything, and keep `Any` for boundaries you cannot
describe yet, such as untyped third-party code.

## Generics

A type parameter ties types together: *whatever type goes in, the same type
comes out*.

<<< ../../examples/python/type_hints/generics.py#generic-functions

The `def first[T](...)` syntax (3.12+) declares `T` right where it is used. You
no longer need a module-level `T = TypeVar("T")`.

### Bounds and constraints

<<< ../../examples/python/type_hints/generics.py#bounds-and-constraints

| Syntax | Meaning |
| --- | --- |
| `[T]` | any type |
| `[T: Base]` | `Base` or any subclass, and the concrete type is preserved |
| `[T: (int, str)]` | exactly `int` or exactly `str` |

A bound is not the same as a plain `Base` parameter. `highest(cards)` returns a
`Card`, whereas `def highest(items: Sequence[Comparable]) -> Comparable` would
return a `Comparable`, and `.suit` would be an error.

### Generic classes

<<< ../../examples/python/type_hints/generics.py#generic-classes

Type-parameter defaults (`class Result[T, E = str]`) are new in 3.13.

## Describing shapes

### `Literal`: a fixed set of values

<<< ../../examples/python/type_hints/structural_types.py#literal

A `Literal` alias is the lightweight choice for a handful of string options. If
the values need methods or iteration, or come from user input that must be
validated, use a [`StrEnum`](./classes#enums).

### `TypedDict`: dicts with known keys

<<< ../../examples/python/type_hints/structural_types.py#typeddict

Use a `TypedDict` for dictionaries that *stay* dictionaries, such as JSON
payloads, `**kwargs` and config files. At runtime it is a plain `dict` and
validates nothing. For data your own code creates and passes around, a
[dataclass](./classes#dataclasses) is better: attribute access, a real type,
methods, and immutability when you want it. To validate untrusted input at
runtime, use a validation library such as Pydantic or msgspec.

### Protocols

<<< ../../examples/python/type_hints/structural_types.py#protocol

A `Protocol` is **structural typing**: a class matches it by having the right
methods, not by inheriting from it. It is the typed version of duck typing, and
the right parameter type whenever you only need *some behaviour* from an
argument. [Classes](./classes#abcs-vs-protocols) compares Protocols with
abstract base classes.

### `NewType` and `Final`

<<< ../../examples/python/type_hints/structural_types.py#newtype

<<< ../../examples/python/type_hints/structural_types.py#final

`NewType` stops you from mixing up two `int` IDs at zero runtime cost.
`OrderId(42)` returns the plain `int` `42`.

## Overloads

When the return type depends on an argument's *value*, a union return type makes
every caller check which one they got. `@overload` declares each combination
separately:

<<< ../../examples/python/type_hints/advanced_signatures.py#overload

Only the undecorated implementation runs. The `@overload` stubs exist for the
checker. Before writing overloads, consider whether two separate functions
(`fetch` and `fetch_many`) would be clearer. They usually are.

## Typed decorators

A decorator that takes `Callable[..., Any]` erases the signature of every
function it wraps. `ParamSpec` (the `**P` in the brackets) captures the
parameters, so the decorated function keeps them:

<<< ../../examples/python/type_hints/advanced_signatures.py#paramspec

```
  calling scale(3.0,)
```

`P.args` and `P.kwargs` must be used together, exactly as shown. To *add* or
*remove* a parameter, for example a decorator that injects a database session,
use `Concatenate[Session, P]`.

## `Self`

<<< ../../examples/python/type_hints/advanced_signatures.py#self

If `where` returned `QueryBuilder`, then `UserQuery.create().where(...).active()`
would fail type checking, because `active` does not exist on `QueryBuilder`.
`Self` means "the class this method was called on".

## Custom narrowing with `TypeIs`

<<< ../../examples/python/type_hints/advanced_signatures.py#typeis

## Exhaustiveness

<<< ../../examples/python/type_hints/advanced_signatures.py#exhaustive

`assert_never` makes a missing case a type error. Add `"hexagon"` to `Shape`
and every `match` that doesn't handle it stops type checking. `Never` is also the
return type of a function that always raises or exits.

## Checklist

- Every function annotated, including `-> None`. Run `mypy --strict`.
- `X | None` for anything that can be missing, and narrow it before use.
- Parameters: `Iterable`, `Sequence`, `Mapping`, or a `Protocol`. Returns:
  `list`, `dict`, or your class.
- `object` rather than `Any`, unless you really mean "stop checking".
- Named `type` aliases for repeated or complex types.
- `TypedDict` for dict-shaped data, dataclasses for your own records, `Literal`
  or `StrEnum` for fixed options.
- Decorators typed with `[**P, R]` and `functools.wraps`.
