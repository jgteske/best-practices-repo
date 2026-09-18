# Modules & Imports

A **module** is a `.py` file. A **package** is a directory of modules with an
`__init__.py`. Almost every "it works on my machine" import problem comes down
to *which directory Python searched*. This page covers organizing code inside
one project. [Namespace Packages & the Import System](./namespace-packages)
goes deeper into how the search itself works.

The example is a small `shop` package, with a script that imports it in every
way there is:

```
examples/python/modules/
├── imports_demo.py          # the script that imports shop
├── circular_imports_demo.py
└── shop/                    # a package: a directory with __init__.py
    ├── __init__.py          # runs on `import shop`; defines the public API
    ├── __main__.py          # runs on `python -m shop`
    ├── models.py            # shop.models
    ├── pricing.py           # shop.pricing
    ├── _rounding.py         # shop._rounding - private by convention
    └── payments/            # a subpackage
        ├── __init__.py
        └── card.py          # shop.payments.card
```

## The forms of `import`

<<< ../../examples/python/modules/imports_demo.py#import-forms

| Statement | Binds the name | Use it when |
| --- | --- | --- |
| `import shop` | `shop` | you use a few things from a module and want the prefix to show where they came from |
| `import shop.pricing` | `shop` (with `.pricing` loaded) | as above, for a submodule |
| `import numpy as np` | `np` | a long name has a universal short alias (`np`, `pd`, `plt`) |
| `from shop import Product` | `Product` | you use a name often, and it is unambiguous on its own |
| `from shop import *` | everything in `shop.__all__` | never in real code: it hides where names come from, and linters flag it |

Order imports in three blocks, standard library, third-party, then your own,
with a blank line between each. `ruff check --select I` sorts them for you.

## `import` runs a module once

<<< ../../examples/python/modules/imports_demo.py#module-cache

The first `import shop.pricing` in a process **executes** `shop/__init__.py`,
then `shop/pricing.py`, top to bottom, and stores the module objects in
`sys.modules`. Every later import, from any file, is just a dictionary lookup
that returns the same object.

Two consequences:

- **Module-level code is import-time code.** Opening a database connection or
  reading a config file at the top of a module happens as a side effect of
  `import`, including in every test that imports it, and in the type checker's
  view of the world. Put that work in functions, and call them from `main()`.
- **Module-level state is a process-wide singleton.** That's sometimes handy
  (a registry, a cache), but it is also global mutable state.

## `__init__.py`: a package's public face

<<< ../../examples/python/modules/shop/__init__.py#init

`__init__.py` runs when the package is imported, and whatever it defines or
imports becomes an attribute of the package. Re-exporting the public classes and
functions here gives users one stable import path, `from shop import Product`,
while you remain free to move code between the modules behind it.

- **`__all__`** lists the public names. It controls `import *`, and type
  checkers and documentation tools read it as "this is the API".
- **A leading underscore** (`_rounding.py`, `_helper()`) marks a module or name
  as internal. Python doesn't enforce it, but tools and readers respect it.
- Keep `__init__.py` light: imports and re-exports, no heavy work. It runs on
  every import of every submodule.
- An empty `__init__.py` is fine too. It just makes the directory a regular
  package.

## Absolute and relative imports

<<< ../../examples/python/modules/shop/pricing.py#pricing

<<< ../../examples/python/modules/shop/payments/card.py#card

| | Absolute: `from shop.models import Product` | Relative: `from .models import Product` |
| --- | --- | --- |
| Reads as | the full path from the top-level package | "next to me" (`.`), "my parent" (`..`) |
| Survives renaming the top-level package | no | yes |
| Works in a file run as a script | yes | **no** (see below) |
| PEP 8 says | preferred | acceptable inside a package |

Pick one style per project. Absolute imports are the safer default: they read
the same in every file, and grep finds them.

### Running a file inside a package

<<< ../../examples/python/modules/shop/__main__.py#main

```
$ python shop/pricing.py
ImportError: attempted relative import with no known parent package

$ python -m shop 25
Python Book: 3999 -> 2999 cents (25% off)
```

`python path/to/file.py` runs the file as a standalone script named `__main__`.
Python doesn't know it belongs to a package, so relative imports have nothing to
be relative to. `python -m package` imports the package properly and runs its
`__main__.py`. To make a package runnable, give it a `__main__.py`, or better,
a [console script](./cli-apps#installing-it-as-a-command), rather than running
its inner files directly.

## `__name__` and `if __name__ == "__main__"`

<<< ../../examples/python/modules/imports_demo.py#module-attributes

```
shop.__name__     shop
pricing.__name__  shop.pricing
this file         __main__
shop.__all__      ['Product', 'apply_discount', 'total']
shop.__file__     shop/__init__.py
```

Each module's `__name__` is its dotted import path, except for the file Python
was started with, which is always `"__main__"`. That's what makes the guard
work:

```python
if __name__ == "__main__":   # true when run, false when imported
    sys.exit(main())
```

A file with that guard can be imported, by tests for example, without its
program running. Keep the guarded block to a single call to `main()`. Code there
can't be imported or tested.

## The `src` layout

Poetry creates this structure, and it's the right default for anything you
install or package:

```
slugkit/
├── pyproject.toml
├── src/
│   └── slugkit/           # the importable package
│       ├── __init__.py
│       ├── py.typed
│       ├── core.py
│       └── cli.py
└── tests/                 # NOT inside the package
    ├── test_core.py
    └── test_cli.py
```

The alternative "flat" layout puts `slugkit/` directly next to
`pyproject.toml`. That looks simpler, but when you run `python -m pytest` or a
script from the project root, that directory is on `sys.path`, so
`import slugkit` imports the *folder* rather than the installed package. Tests pass locally even when the built wheel is missing a
file or the packaging config is wrong. With `src/`, the only way to import
`slugkit` is to install it (`poetry install` does that, in editable mode), so the
tests exercise what users actually get.

## Structuring modules inside a project

- **Organize by feature, not by kind.** `billing/`, `accounts/`, `reports/`
  scale better than `models/`, `utils/`, `helpers/`. A `utils.py` tends to
  collect everything that has no home.
- **Keep dependencies pointing one way.** For example, `cli` → `services` →
  `models`, with nothing importing "upwards". Most circular imports come from
  breaking this rule.
- **Keep I/O at the edges.** Pure logic modules that don't read files, touch
  the network or print are trivial to test. `slugkit.core` is pure, and
  `slugkit.cli` does the I/O.
- **Never name a module after a standard library module** (`random.py`,
  `json.py`, `email.py`, `test.py`). Your file wins the search, and the real
  module becomes unimportable. Python 3.13 now says so explicitly:

```
$ python dice.py        # next to a file called random.py
AttributeError: module 'random' has no attribute 'randint' (consider renaming
'.../shadow/random.py' since it has the same name as the standard library module
named 'random' and prevents importing that standard library module)
```

## Circular imports

Two modules that import names from each other at the top level can't both
finish loading first:

<<< ../../examples/python/modules/circular_imports_demo.py#circular

```
broken  -> ImportError: cannot import name 'Customer' from partially initialized module 'app.customers' (most likely due to a circular import) (<tmp>/app/customers.py)
fixed   -> imported fine
```

`customers` starts loading, imports `orders`, and `orders` asks for `Customer`,
which hasn't been defined yet because `customers` stopped at its first line.
Fixes, from best to worst:

1. **Restructure.** Move the shared piece into a third module both can import,
   or merge the two modules. A cycle usually means the split between them is
   wrong.
2. **Import for type checking only.** If the name is only needed for
   annotations, which is the most common case:

<<< ../../examples/python/modules/circular_imports_demo.py#circular-fixed

3. **Import inside the function** that needs it. This works, but it hides the
   dependency.

## Checklist

- Every installable project uses the `src/` layout, and tests live outside the
  package.
- Public API is re-exported from `__init__.py` and listed in `__all__`.
  Internals start with `_`.
- No side effects at import time. Real work runs from `main()`.
- Packages are run with `python -m pkg` or a console script, never as
  `python pkg/inner.py`.
- Absolute imports, sorted by the linter, and no `import *`.
- No module names that shadow the standard library.
