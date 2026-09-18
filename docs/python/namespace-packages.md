# Namespace Packages & the Import System

How does `import acme.report` find its code? This page answers that, and uses
the answer for one specific job: several independently installable
distributions (`acme-core`, `acme-report`, ...) that all live under one
top-level import name, `acme`. The Google Cloud (`google.cloud.*`) and Azure
(`azure.*`) SDKs are built this way.

Examples: [`namespaces/namespace_demo.py`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/namespaces/namespace_demo.py)
and the two real Poetry projects
[`projects/acme-core`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/projects/acme-core)
and [`projects/acme-report`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/projects/acme-report).

## How `import` finds a module

For `import acme.report`, Python:

1. Checks `sys.modules`. If `acme.report` was imported before, that's the
   answer.
2. Otherwise imports the parent, `acme`, first, using the same steps.
3. Asks each **finder** on `sys.meta_path` in turn. The one that matters here,
   the path finder, walks a list of directories looking for a match. For a
   top-level name that list is `sys.path`. For a submodule it's the parent
   package's `__path__`.
4. Loads the match, runs it, and stores it in `sys.modules`.

<<< ../../examples/python/namespaces/namespace_demo.py#search-path

`sys.path` is built at startup, in this order:

| Entry | Comes from |
| --- | --- |
| the script's directory, or the cwd for `-m` and `-c` | how Python was started |
| `PYTHONPATH` entries | the environment variable |
| the standard library | the interpreter's installation |
| `site-packages` | the active venv: what pip and Poetry install into |

The first entry explains many "works in one directory, fails in another"
problems. `python scripts/run.py` makes `scripts/` importable, while
`python -m scripts.run` makes the current directory importable instead.

::: tip Don't reach for `sys.path.append`
Editing `sys.path` in application code, or setting `PYTHONPATH`, makes imports
depend on where and how the program is started. Install the package instead
(`poetry install` does it in editable mode) and import it by name from
anywhere. The demo on this page edits `sys.path` only to *simulate* two
installs without installing anything.
:::

## Regular vs namespace packages

In each directory on the search path, the path finder looks for, in order:

| It finds | Result |
| --- | --- |
| `acme/__init__.py` | a **regular package**, and the search **stops** there. `acme.__path__` is that one folder |
| `acme.py`, or a compiled extension | a module, and the search stops |
| `acme/` *without* `__init__.py` | it's noted as a namespace portion, and the search **continues** |

If the whole search finishes without a regular package or module, but found
`acme/` folders along the way, Python creates a **namespace package**
([PEP 420](https://peps.python.org/pep-0420/)) whose `__path__` lists **all** of
those folders.

<<< ../../examples/python/namespaces/namespace_demo.py#namespace-import

```
acme.__file__: None
acme.__path__:
    acme-core/src/acme
    acme-report/src/acme
```

Two folders from two different projects merged into one package. `acme.core`
is found in the first, `acme.report` in the second, and `acme.report` can import
`acme.core` as if they had always shipped together:

<<< ../../examples/python/projects/acme-report/src/acme/report/__init__.py#report

<<< ../../examples/python/namespaces/namespace_demo.py#find-spec

```
acme.report loads from: acme-report/src/acme/report/__init__.py
```

## The one rule: nobody ships `acme/__init__.py`

<<< ../../examples/python/namespaces/namespace_demo.py#regular-package-shadowing

```
with acme/__init__.py in both:
    acme.__path__ = ['first']
    ModuleNotFoundError: No module named 'acme.report'
```

With an `__init__.py`, the first `acme/` found becomes a regular package, its
`__path__` is that one folder, and the other distribution's subpackage can no
longer be found. No error mentions the cause. The subpackage just seems to be
missing. Which distribution "wins" depends on install order and `sys.path`
order, which is why this bug appears on one machine and not another.

So, for a shared namespace:

- **No distribution** contains `acme/__init__.py`. Not an empty one, and not
  one with a docstring.
- Each distribution owns exactly one subpackage (`acme/core/`,
  `acme/report/`), and *those* are regular packages with their own
  `__init__.py`.
- Nothing may be defined directly on `acme` itself, because there is no file to
  define it in.

## Packaging the namespace with Poetry

Each distribution tells Poetry to package only its own subpackage:

<<< ../../examples/python/projects/acme-core/pyproject.toml#project{toml}

<<< ../../examples/python/projects/acme-report/pyproject.toml#project{toml}

The built wheels contain only their own subfolder. There is no
`acme/__init__.py` anywhere:

```
acme_core-0.1.0-py3-none-any.whl
  acme/core/__init__.py
  acme_core-0.1.0.dist-info/METADATA
  ...
acme_report-0.1.0-py3-none-any.whl
  acme/report/__init__.py
  acme_report-0.1.0.dist-info/METADATA        Requires-Dist: acme-core (>=0.1,<0.2)
  ...
```

Once both are installed, pip unpacks them into the *same*
`site-packages/acme/` directory. That folder still has no `__init__.py`, so it
stays a namespace package, and a third distribution can add `acme/billing/`
later. During development, with editable installs, the portions live in
separate folders instead, as in the demo, and the merged `__path__` is what
holds them together. `npm run check:python` tests both cases: it builds both
wheels, installs them into a fresh venv, and imports across them.

`acme-report` declares its dependency on `acme-core` twice, and each
declaration has a different job. `[project].dependencies` is what goes into the
published wheel. `[tool.poetry.dependencies]` points local development at the
sibling folder. [Building & Consuming Packages](./building-packages#consuming-a-local-package-from-another-project)
shows what happens if you only write the second one.

## Type checkers and namespace packages

mypy supports namespace packages by default. If mypy reports a module under
two different names, or can't find `acme.core` inside your own repository,
point it at the source roots with `mypy_path = "src"` and set
`explicit_package_bases = true`. This repository's
[`mypy.ini`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/mypy.ini)
does exactly that for both `src/` folders.

## When to use a namespace package

**Use one** when separately released distributions have to share a brand-level
prefix: plugins for a framework, or one SDK split into independently
installable parts.

**Don't use one** just to group modules inside a single project. A normal
package with `__init__.py` is simpler, faster to import, and can hold shared
code at the top level. A directory that is missing its `__init__.py` by accident
also becomes a namespace package, and silently works until two of them collide.

## Checklist

- Know your `sys.path`: `python -c "import sys; print(*sys.path, sep='\n')"`.
- Install packages, even your own (editable). Don't edit `sys.path` or
  `PYTHONPATH` to make imports work.
- In a shared namespace, no distribution ships the top-level `__init__.py`.
- Each distribution packages only its own subpackage
  (`include = "acme/core"`).
- `importlib.util.find_spec("name")` tells you which file an import would load.
