# Testing with pytest

[pytest](https://docs.pytest.org/) is the standard test runner for Python. A
test is a function whose name starts with `test_`, a check is a plain `assert`,
and anything a test needs (a temp directory, a fake environment variable, a
prepared object) arrives as a **fixture** parameter. The examples are in
[`examples/python/testing`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/testing),
and `npm run check:python` runs them.

## Setup

```bash
poetry add --group dev pytest
poetry run pytest              # discover and run everything
poetry run pytest -x           # stop at the first failure
poetry run pytest -k remove    # only tests whose name matches "remove"
poetry run pytest tests/test_cli.py::test_errors_go_to_stderr_with_exit_code_1
poetry run pytest --lf         # re-run only the tests that failed last time
```

Configure it once, in `pyproject.toml`:

<<< ../../examples/python/projects/slugkit/pyproject.toml#tools{toml}

- `testpaths` makes a bare `pytest` look only in `tests/`.
- `--strict-markers` turns a typo in `@pytest.mark.slwo` into an error instead
  of a silently unselectable test.
- `--import-mode=importlib` is the mode the pytest docs recommend for new
  projects. Test files don't need `__init__.py`, and two `test_utils.py` files
  in different folders don't clash.

**Layout.** Tests live in `tests/` next to `src/` (see
[the src layout](./modules-and-imports#the-src-layout)), one test file per
module: `test_core.py` for `core.py`, `test_cli.py` for `cli.py`.

## The code under test

<<< ../../examples/python/testing/inventory.py#inventory

## Plain `assert`, and `pytest.raises`

<<< ../../examples/python/testing/test_inventory.py#basics

There is no `assertEqual` family to learn. pytest rewrites `assert`
statements, so a failure shows both sides of the comparison, down to the first
differing key of a dict or the differing character in a string. `pytest.raises`
checks the exception type, and `match=` checks its message with a regex search.

## Fixtures

A fixture is a function marked `@pytest.fixture`. A test requests one by naming
it as a parameter, and pytest calls the fixture and passes in the result:

<<< ../../examples/python/testing/conftest.py#conftest

Fixtures defined in a `conftest.py` are available to every test in that
directory and below, without an import. Each test gets a **fresh** result by
default, so tests can't leak state into each other.

### Setup and teardown with `yield`

<<< ../../examples/python/testing/test_inventory.py#yield-fixture

Code after `yield` runs after the test, pass or fail. It's the fixture version
of a [context manager](./errors-and-context-managers#context-managers). Widen
the lifetime with `@pytest.fixture(scope="module")` or `scope="session"` for
expensive resources, such as a database container started once per run.

### Built-in fixtures worth knowing

<<< ../../examples/python/testing/test_inventory.py#builtin-fixtures

| Fixture | Gives you |
| --- | --- |
| `tmp_path` | a fresh, empty `pathlib.Path` directory per test |
| `monkeypatch` | `setenv`, `delenv`, `setattr`, `chdir`, all undone after the test |
| `capsys` | captured stdout and stderr: `capsys.readouterr().out` |
| `caplog` | captured `logging` records |
| `request` | information about the requesting test, for advanced fixtures |

## Parametrize: one test, many cases

<<< ../../examples/python/testing/test_inventory.py#parametrize

```
test_inventory.py::test_add_rejects_non_positive[0] PASSED
test_inventory.py::test_add_rejects_non_positive[-1] PASSED
test_inventory.py::test_add_rejects_non_positive[-100] PASSED
test_inventory.py::test_add_many[single] PASSED
test_inventory.py::test_add_many[accumulates] PASSED
test_inventory.py::test_add_many[separate-skus] PASSED
```

Each case is a separate test, with its own pass/fail and its own ID (named with
`pytest.param(..., id=...)`). Prefer this to a loop inside a single test,
which stops at the first failing case and hides the rest.

## Testing a real package

`slugkit` shows the same tools on a real project: a parametrized table of
slugify cases, and a CLI tested through `capsys`, `monkeypatch`, and one
subprocess:

<<< ../../examples/python/projects/slugkit/tests/test_core.py#test-core

[Command-Line Apps](./cli-apps#testing-the-cli) walks through the CLI tests.

## What to test, and how

- **Test behaviour through the public API.** Tests that reach into `_private`
  helpers break on every refactor.
- **Keep I/O at the edges** so that most tests are pure function calls. A
  slugify test needs no fixture at all.
- **Mock as little as possible.** Pass collaborators in
  ([composition](./classes#composition-over-inheritance)) and hand tests a
  simple fake, instead of patching module internals with `unittest.mock.patch`.
  Use `monkeypatch` for the environment, the clock, and the network edge.
- **One reason to fail per test.** A name like
  `test_errors_go_to_stderr_with_exit_code_1` tells you what broke before you
  open the file.
- **Measure coverage, don't worship it.** `poetry add --group dev pytest-cov`,
  then `pytest --cov=slugkit --cov-report=term-missing` lists the lines never
  executed. Untested *branches* matter more than the percentage.

## Checklist

- `tests/` next to `src/`, `test_<module>.py` per module, and pytest settings
  in `pyproject.toml`.
- Plain `assert`, and `pytest.raises(..., match=...)` for errors.
- Shared setup in fixtures (`conftest.py`), never in module-level globals.
- `tmp_path`, `monkeypatch` and `capsys` instead of real files, a real
  environment, or real stdout.
- `@pytest.mark.parametrize` instead of loops over cases.
- Run in CI on every change: `poetry run pytest`.
