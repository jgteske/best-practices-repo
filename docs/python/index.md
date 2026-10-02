# Python

A guide to modern Python: the language first, then the standard library you
reach for every day (asyncio, logging, files), then how Python projects are set
up in practice. That means virtual environments and dependencies with Poetry,
modules and namespaces, building a package and importing it from another
project, command-line tools, tests, type checking, and notebooks.

Every example on these pages is a real file under
[`examples/python`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python),
imported directly into the page. `npm run check:python` **runs** each one, and
the files are full of `assert`s, so a wrong claim fails the build. It also runs
`mypy --strict` over all of them and checks that every type error quoted in a
comment is the error mypy actually reports. It runs ruff and the pytest
examples, executes the example notebook, and builds and installs the real Poetry
projects under `examples/python/projects`.

## What's covered

<div class="vp-doc">

**The language**

| Page | Focus |
| --- | --- |
| [Python Basics](./basics) | Names vs objects, mutability, truthiness, numbers, strings and f-strings, the four collections, unpacking, comprehensions, `match`, parameters, closures and decorators. |
| [Function Typing](./function-typing) | Annotations that pass `mypy --strict`: `X \| None`, abstract parameter types, aliases, `Callable`, `*args`/`**kwargs`, generics, `TypedDict`, `Protocol`, `@overload`, typed decorators, `Self`, `TypeIs`, exhaustiveness. |
| [Classes & Dataclasses](./classes) | Anatomy of a class, properties, class vs static methods, dunder methods, `@dataclass`, enums, inheritance and the MRO, ABCs vs Protocols, composition. |
| [Errors & Context Managers](./errors-and-context-managers) | Exception hierarchies, `raise ... from`, EAFP, `add_note`, `ExceptionGroup`/`except*`, and `with` written three ways. |
| [Iterators & Generators](./iterators-and-generators) | The iteration protocol, lazy pipelines, `yield from`, `send()`, custom iterables, and `itertools`. |

**Standard library in practice**

| Page | Focus |
| --- | --- |
| [Async with asyncio](./asyncio) | Coroutines vs tasks, `TaskGroup` and exception groups, cancellation, timeouts, `Semaphore` limits, worker queues, `to_thread`, and async generators. |
| [Logging](./logging) | Loggers, handlers and levels, what libraries vs applications configure, `dictConfig`, lazy `%s` arguments, `logger.exception`, and JSON logs with request context. |
| [Files, Paths & I/O](./files-and-io) | `pathlib`, encodings, text vs bytes, streaming large files, JSON and CSV, `shutil` and `tempfile`, and atomic writes. |

**Projects & environments**

| Page | Focus |
| --- | --- |
| [Poetry & Virtual Environments](./poetry-and-virtualenvs) | Why every project gets its own venv, installing Poetry, `poetry new`, `pyproject.toml`, in-project `.venv`, `poetry run` vs activating. |
| [Managing Dependencies](./dependencies) | `add`/`remove`, version constraints, dependency groups, the lock file, `sync`, updating, extras, git and path sources. |
| [Modules & Imports](./modules-and-imports) | Modules vs packages, `__init__.py`, the `src/` layout, absolute vs relative imports, `__all__`, `__main__`, `python -m`, circular imports. |
| [Namespace Packages & the Import System](./namespace-packages) | How `import` searches `sys.path`, regular vs namespace packages, and one `acme.*` namespace split across two distributions. |

**Packaging & distribution**

| Page | Focus |
| --- | --- |
| [Building & Consuming Packages](./building-packages) | `poetry build`, what goes in a wheel and an sdist, `py.typed`, versioning, importing your package from another project, publishing. |
| [Command-Line Apps](./cli-apps) | `argparse` with subcommands, stdin/stdout/stderr, exit codes, `[project.scripts]`, `__main__.py`, testing a CLI, and when Click or Typer earn their place. |

**Quality & workflow**

| Page | Focus |
| --- | --- |
| [Testing with pytest](./testing-with-pytest) | Layout, plain `assert`, fixtures and `conftest.py`, `parametrize`, `tmp_path`, `monkeypatch`, and what to test. |
| [Linting & Type Checking](./tooling) | ruff for lint and format, mypy in strict mode, configuring both in `pyproject.toml`, pre-commit, and CI. |
| [Jupyter Notebooks](./jupyter-notebooks) | Jupyter in a Poetry project, kernels, VS Code, autoreload, importing your own code, notebooks in git, and running them headless. |

**Reference**

| Page | Focus |
| --- | --- |
| [Cheat Sheet](./cheatsheet) | One-line reminders for the language, typing, Poetry, pytest, and the tools, grouped by task. |

</div>

## What these pages assume

- **Python 3.13 or newer.** Several features used here are recent:
  `type` aliases and `def f[T]` generics (3.12), `@override` (3.12),
  `TypeIs`, `ReadOnly` and type-parameter defaults (3.13). Where something is
  newer than 3.10, the version is noted next to it.
- **Poetry 2.x.** Poetry 2 moved project metadata into the standard `[project]`
  table and writes development dependencies to `[dependency-groups]`
  ([PEP 735](https://peps.python.org/pep-0735/)). Older tutorials that put
  everything under `[tool.poetry]` describe Poetry 1.
- **Type hints everywhere.** Every example passes `mypy --strict`. Python does
  not enforce annotations at runtime, so a type checker is part of the
  toolchain. See [Linting & Type Checking](./tooling).

## Suggested reading order

New to Python: read the four language pages in order, then
[Poetry & Virtual Environments](./poetry-and-virtualenvs) before you install
anything.

Coming from another language: skim [Python Basics](./basics) for the parts that
surprise people (names and mutability, truthiness, mutable defaults, late-binding
closures), then go straight to the project pages.

Setting up a real project: [Poetry](./poetry-and-virtualenvs) →
[Dependencies](./dependencies) → [Modules & Imports](./modules-and-imports) →
[Testing](./testing-with-pytest) → [Tooling](./tooling) →
[Building](./building-packages).

## The three things that explain most Python surprises

**1. Variables are names, not boxes.** Assignment binds a second name to the
*same* object; it never copies. That is why a list changed through one name is
changed through all of them, and why a mutable default argument remembers the
calls before it. See [Python Basics](./basics#names-and-objects).

**2. `import` runs code, once, and finds it on `sys.path`.** Most import
problems come from the search path: a script run from the wrong directory, a
package that is not installed, a file named like a stdlib module, or an
`__init__.py` that hides a namespace. See [Modules & Imports](./modules-and-imports)
and [Namespace Packages](./namespace-packages).

**3. Annotations are not checked at runtime.** `def f(x: int)` accepts a string
without complaint. Type hints pay off only when a checker runs on every change,
in your editor and in CI.
