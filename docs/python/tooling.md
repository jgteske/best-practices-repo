# Linting & Type Checking

Two tools catch most mistakes before any test runs.
**[ruff](https://docs.astral.sh/ruff/)** lints and formats: unused imports,
likely bugs, outdated syntax, import order and code style. **[mypy](https://mypy.readthedocs.io/)**
checks the type hints. Both are configured in `pyproject.toml` and run in the
editor, in a pre-commit hook, and in CI. Every Python example in this
repository passes both.

## What they catch

Here is some plausible-looking code:

```python
import os, sys
from typing import List


def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags


def load(path: str) -> List[str]:
    try:
        return open(path).read().splitlines()
    except:
        return None
```

```
$ ruff check --output-format concise .
demo.py:1:1: E401 [*] Multiple imports on one line
demo.py:1:1: I001 [*] Import block is un-sorted or un-formatted
demo.py:1:8: F401 [*] `os` imported but unused
demo.py:1:12: F401 [*] `sys` imported but unused
demo.py:2:1: UP035 `typing.List` is deprecated, use `list` instead
demo.py:5:23: B006 Do not use mutable data structures for argument defaults
demo.py:10:24: UP006 [*] Use `list` instead of `List` for type annotation
demo.py:13:5: E722 Do not use bare `except`
Found 8 errors.
[*] 5 fixable with the `--fix` option (1 hidden fix can be enabled with the `--unsafe-fixes` option).
```

`ruff check --fix` repairs the mechanical ones. The two that are left, the
[mutable default](./basics#the-mutable-default-trap) and the
[bare except](./errors-and-context-managers#catch-narrowly), are real bugs
that need a decision from you. Fix the bare `except` and mypy finds what ruff
can't:

```
$ mypy --strict demo.py
demo.py:4: error: Function is missing a type annotation  [no-untyped-def]
demo.py:13: error: Incompatible return value type (got "None", expected "list[str]")  [return-value]
```

`load` promises a `list[str]` and returns `None` on failure. Every caller would
crash on `.append` or `len()`, but only when the file is missing.

## ruff

```bash
poetry add --group dev ruff
poetry run ruff check .           # lint
poetry run ruff check --fix .     # lint and apply safe fixes
poetry run ruff format .          # format (Black-compatible)
poetry run ruff format --check .  # CI: fail if anything would be reformatted
```

ruff replaces a whole stack of older tools (flake8 and its plugins, isort,
pyupgrade, Black) with one fast binary. By default it enables only a
conservative set of rules. Select more explicitly:

<<< ../../examples/python/ruff.toml{toml}

| Rule set | Catches |
| --- | --- |
| `E`, `W` (pycodestyle) | style errors: bare `except`, multiple imports per line |
| `F` (pyflakes) | unused imports and variables, undefined names, `import *` |
| `I` (isort) | import grouping and order, auto-fixed |
| `B` (bugbear) | likely bugs: mutable defaults, closures over loop variables, `zip` without `strict` |
| `UP` (pyupgrade) | syntax older than your `target-version`: `List[int]`, `Optional[X]`, `.format()` |
| `SIM` | code that has a simpler equivalent |
| `RUF` | ruff's own checks, such as `None` not last in a union, or mutable class defaults |

When a rule is wrong for one line, silence *that line*, with the reason, rather
than disabling the rule everywhere:

```python
theme = settings["theme"] if "theme" in settings else "light"  # noqa: SIM401
```

## mypy

```bash
poetry add --group dev mypy
poetry run mypy src tests
```

<<< ../../examples/python/projects/slugkit/pyproject.toml#tools{toml}

**Start with `strict = true`** in a new project. It enables every optional
check, and the most important ones are:

| Flag (included in `strict`) | Effect |
| --- | --- |
| `disallow_untyped_defs` | every function needs annotations. Without this, unannotated functions aren't checked at all |
| `disallow_any_generics` | `list` must be `list[str]`: no silent `list[Any]` |
| `warn_return_any` | flags an `Any` leaking out of a typed function |
| `no_implicit_reexport` | `from pkg import x` must use something `pkg` re-exports on purpose (via `__all__`) |
| `strict_equality` | comparisons that can never be true, like `Color.RED == 1` |
| `warn_unused_ignores` | a `# type: ignore` that is no longer needed is an error |

`warn_unreachable` isn't part of `strict`, but it's worth adding. It flags
code that the types say can never run, which usually means a narrowing check is
wrong.

**Adopting it in an existing codebase.** Turn on `strict` and exclude the
worst modules with per-module overrides, then remove the overrides one module at
a time:

```toml
[[tool.mypy.overrides]]
module = ["legacy.*"]
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = ["some_untyped_library.*"]   # a dependency without type hints or stubs
ignore_missing_imports = true
```

For popular untyped libraries, install the community stubs first
(`poetry add --group dev types-requests`, `types-PyYAML`, ...) before reaching
for `ignore_missing_imports`.

::: tip mypy or pyright?
[pyright](https://github.com/microsoft/pyright), which powers VS Code's Pylance,
is faster and sometimes stricter, and your editor is probably running it
already. mypy is the reference implementation and the more common choice in CI.
Pick one for CI. The type hints themselves are the same for both.
:::

## In the editor

- **VS Code:** the Python extension with Pylance, plus the Ruff extension.
  Select the project's `.venv` as the interpreter (Poetry's in-project venv is
  detected automatically), and turn on format-on-save with Ruff as the
  formatter.
- **PyCharm:** set the Poetry environment as the project interpreter, and
  install the Ruff plugin.

## pre-commit: checks before every commit

[pre-commit](https://pre-commit.com/) runs the checks on the changed files when
you `git commit`, and rejects the commit if they fail:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.16.8
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
  - repo: local
    hooks:
      - id: mypy
        name: mypy
        entry: poetry run mypy src tests   # the project's venv sees every dependency
        language: system
        types: [python]
        pass_filenames: false
```

```bash
pipx install pre-commit
pre-commit install            # once per clone: installs the git hook
pre-commit run --all-files    # run everything now
```

mypy runs as a `local` hook through the project's own environment. mypy has to
import-check your dependencies, and pre-commit's isolated environments don't
have them.

## In CI

```yaml
- run: pipx install poetry
- run: poetry sync
- run: poetry check --lock
- run: poetry run ruff check --output-format=github .
- run: poetry run ruff format --check .
- run: poetry run mypy src tests
- run: poetry run pytest
```

`--output-format=github` turns ruff findings into inline annotations on the
pull request. This repository's own checks work the same way:
[`scripts/check-python.sh`](https://github.com/jgteske/best-practices-repo/tree/main/scripts/check-python.sh).

## Checklist

- ruff (lint and format) and mypy (`strict = true`) are dev dependencies,
  configured in `pyproject.toml`.
- Rule sets are selected explicitly: at least `E, W, F, I, B, UP`.
- `# noqa: RULE` / `# type: ignore[code]` only on single lines, and always with
  the specific code.
- The same checks run in the editor, in pre-commit, and in CI.
