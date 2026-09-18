# Classes & Dataclasses

Python classes are simple: no access modifiers, no overloaded constructors, no
interfaces keyword. They rely on conventions and a few decorators. This page
walks through every kind of class member, then the two kinds of classes you
should write most often (**dataclasses** and **enums**), then inheritance, and
when not to use it.

Examples: [`examples/python/classes`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/classes).

## Anatomy of a class

<<< ../../examples/python/classes/class_anatomy.py#anatomy

| Member | Declared as | Receives | Use for |
| --- | --- | --- | --- |
| instance attribute | `self.x = ...` in `__init__` | - | per-object state |
| class attribute | `x: ClassVar[T] = ...` in the class body | - | constants and state shared by every instance |
| method | `def m(self, ...)` | the instance | behaviour |
| property | `@property` | the instance | computed or validated attributes |
| class method | `@classmethod def m(cls, ...)` | the class | alternative constructors (`from_csv`, `from_dict`) |
| static method | `@staticmethod def m(...)` | nothing | a helper that belongs to the class's namespace |

A few points worth knowing:

- **`__init__` is not a constructor.** The object already exists (`__new__`
  created it). `__init__` only sets it up, and it returns `None`.
- **`self` is explicit.** `account.deposit(50)` is
  `BankAccount.deposit(account, 50)`.
- **There is no `private`.** A single leading underscore (`_balance`) means
  "internal, don't touch", and linters and IDEs respect it. A double underscore
  (`__balance`) triggers name mangling. Its purpose is to avoid clashes in
  subclasses, not privacy, and you rarely need it.
- **Alternative constructors are class methods.** Python has no constructor
  overloading. `BankAccount.from_csv(line)` is clearer than an `__init__` that
  inspects its arguments. Because it calls `cls(...)`, it builds subclasses
  correctly too.
- **`__repr__` for developers, `__str__` for users.** Always define `__repr__`.
  Debuggers, logs and the REPL show it.

## Class vs instance attributes

<<< ../../examples/python/classes/class_anatomy.py#class-vs-instance

A mutable class attribute is shared by *every* instance. It is the class-level
version of the [mutable default trap](./basics#the-mutable-default-trap).
Annotating it `ClassVar` makes the intent explicit, and dataclasses skip
`ClassVar` fields.

## Properties

<<< ../../examples/python/classes/class_anatomy.py#property-setter

Start with plain attributes. Because a property is read and assigned exactly
like an attribute, you can turn `celsius` into a validated property later
without changing a single caller. Unlike Java, Python never needs
getter/setter methods up front.

## Dunder methods

"Dunder" (double-underscore) methods hook your class into Python's syntax and
built-ins: `==`, `<`, `+`, `len()`, `bool()`, `in`, `for`, `with`, and more.

<<< ../../examples/python/classes/class_anatomy.py#dunders

| To support | Implement |
| --- | --- |
| `repr(x)`, `str(x)`, `f"{x}"` | `__repr__`, `__str__`, `__format__` |
| `==`, `hash(x)`, set/dict membership | `__eq__` **and** `__hash__` |
| `<`, `sorted()`, `max()` | `__lt__` (plus `@functools.total_ordering` for the rest) |
| `+`, `-`, `*` | `__add__`, `__sub__`, `__mul__` (and `__radd__`, ... for the reflected side) |
| `len(x)`, `bool(x)` | `__len__`, `__bool__` |
| `x[key]`, `key in x`, `for v in x` | `__getitem__`, `__contains__`, `__iter__` |
| `with x:` | `__enter__`, `__exit__`, see [context managers](./errors-and-context-managers#context-managers) |
| `x()` | `__call__` |

Return `NotImplemented` (the constant, not the exception) from a comparison or
operator that doesn't recognise the other operand. Python then tries the other
operand's method before raising `TypeError`.

::: warning Defining `__eq__` removes `__hash__`
A class that defines `__eq__` without `__hash__` becomes unhashable, so its
instances can no longer go in sets or be dict keys. If the object is immutable,
define `__hash__` from the same fields `__eq__` compares. If it's mutable, leave
it unhashable. A frozen dataclass does all of this for you.
:::

## Dataclasses

Most classes exist to hold data. `@dataclass` generates `__init__`, `__repr__`
and `__eq__` from the annotated fields, which removes most of the boilerplate
above:

<<< ../../examples/python/classes/dataclasses_and_enums.py#dataclass

### Frozen, slotted, keyword-only

<<< ../../examples/python/classes/dataclasses_and_enums.py#frozen

A good default for value objects is
**`@dataclass(frozen=True, slots=True, kw_only=True)`**:

| Option | Effect |
| --- | --- |
| `frozen=True` | assignment raises `FrozenInstanceError`, and the instance is hashable. "Changing" it means `dataclasses.replace` |
| `slots=True` | uses `__slots__`: less memory, faster attribute access, and a typo such as `obj.lattitude = 1` raises instead of silently adding an attribute |
| `kw_only=True` | callers must name every field, so adding or reordering fields never breaks them |
| `order=True` | generates `<`, `<=`, ... comparing fields in order |

`__post_init__` is the place for validation. It runs at the end of the
generated `__init__`.

### Derived and non-init fields

<<< ../../examples/python/classes/dataclasses_and_enums.py#derived-fields

- `field(default_factory=list)` for any mutable default. A plain `= []` is
  rejected by `@dataclass` with a `ValueError`.
- `field(init=False)` for values computed in `__post_init__`.
- `InitVar[T]` for constructor-only arguments that shouldn't be stored.
- `compare=False` / `repr=False` to leave a field out of `==` or `repr`.

::: tip Dataclass, `NamedTuple`, `TypedDict`, or Pydantic?
**Dataclass** for your own records. **`NamedTuple`** when it must also *be* a
tuple (unpacking, legacy APIs). **`TypedDict`** when it must stay a `dict`, as
JSON does. **Pydantic/msgspec** when the data comes from outside and needs
validating and parsing at runtime.
:::

## Enums

<<< ../../examples/python/classes/dataclasses_and_enums.py#enums

`StrEnum` (3.11+) is usually the right choice. Its members *are* strings, so
they serialise to JSON and format into f-strings as their value.
`Status("published")` parses input and raises `ValueError` for unknown values.
Use a plain `Enum` when the value is an implementation detail, and `IntFlag`
for combinable options.

## Inheritance

<<< ../../examples/python/classes/inheritance_and_protocols.py#inheritance

- Call `super().__init__(...)` in every subclass `__init__`, so the parent
  initialises its own state.
- Mark overriding methods with `@override` (3.12+). If the parent method is
  renamed, the checker flags the orphaned override instead of letting it
  silently stop overriding anything.

### Multiple inheritance and the MRO

<<< ../../examples/python/classes/inheritance_and_protocols.py#mro

`super()` doesn't mean "my parent". It means "the next class in the **Method
Resolution Order**" of the object's actual class. That lets every class in a
diamond run exactly once. It also means a class can't know which method its
`super()` call will reach. Use multiple inheritance only for small, independent
mixins.

## ABCs vs Protocols

Both describe "something with these methods". They differ in who has to opt in.

<<< ../../examples/python/classes/inheritance_and_protocols.py#abc

```
  Can't instantiate abstract class Exporter without an implementation for abstract method 'format_row'
```

<<< ../../examples/python/classes/inheritance_and_protocols.py#protocol-vs-abc

| | Abstract base class (`ABC`) | `Protocol` |
| --- | --- | --- |
| Implementers must | inherit from it | just have the methods |
| Shares implementation | yes: template methods and hooks | no (it can, but implementers don't inherit it) |
| Enforced at | instantiation (`TypeError`) | type-check time |
| Works with classes you don't own | no | yes |
| Use it for | a base class in a framework you control | parameter types: "what do I need from this argument?" |

## Composition over inheritance

<<< ../../examples/python/classes/inheritance_and_protocols.py#composition

Inheritance couples a subclass to every detail of its parent. Passing a
collaborator in ("has a" rather than "is a") keeps classes small, and in tests
you can pass a fake. Use inheritance for a real *is-a* relationship with shared
behaviour, and use composition for everything else.

## Checklist

- Data-holding classes are `@dataclass(frozen=True, slots=True, kw_only=True)`
  unless they need to change.
- `__repr__` on everything, and `__eq__` together with `__hash__` (or neither).
- Plain attributes first. Switch to a property when you need computation or
  validation.
- Alternative constructors are `@classmethod`s that call `cls(...)`.
- `StrEnum` for fixed sets of values.
- `@override` on every override, and `super().__init__()` in every subclass.
- A `Protocol` for parameter types, an ABC only when implementers should share
  code.
