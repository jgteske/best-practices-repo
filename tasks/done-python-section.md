# TODO - Python section

Goal: a new top-level `docs/python/` guide with the same standard as the other
sections. Every snippet is a real file under `examples/python/`, and
`npm run check:python` runs and verifies them.

Baseline: **Python 3.13+**, **Poetry 2.x** (`[project]` + `[dependency-groups]`).
The plan said 3.12. It moved to 3.13 because `TypeIs`, `ReadOnly`, type-parameter
defaults and `batched(strict=)` are used, and 3.12 is security-only by now.

## Pages (`docs/python/`)

- [x] `index.md`, `basics.md`, `function-typing.md`, `classes.md`
- [x] `errors-and-context-managers.md`, `iterators-and-generators.md` *(extras)*
- [x] `poetry-and-virtualenvs.md`, `dependencies.md`, `modules-and-imports.md`, `namespace-packages.md`
- [x] `building-packages.md`, `cli-apps.md`
- [x] `standalone-executables.md` *(added on request)* - PyInstaller, Windows + Linux
- [x] `testing-with-pytest.md`, `tooling.md` *(extras)*
- [x] `jupyter-notebooks.md` *(added on request)*
- [x] `cheatsheet.md`

## Examples (`examples/python/`)

- [x] `language/`, `type_hints/`, `classes/`, `errors/`, `iteration/` - runnable, assert-backed
      (`typing/` was renamed `type_hints/` so it cannot shadow the stdlib module for mypy)
- [x] `modules/` - `shop` package, import demo, circular-import demo
- [x] `namespaces/namespace_demo.py` - merged `acme.__path__`, and the `__init__.py` mistake
- [x] `testing/` - pytest examples
- [x] `notebooks/` - `sales_exploration.ipynb` (committed without outputs) + `analysis.py`
- [x] `projects/slugkit` - library + CLI + tkinter GUI, src layout, py.typed, tests, bundle group
- [x] `projects/blog-app` - consumes slugkit via an editable path dependency
- [x] `projects/acme-core` + `projects/acme-report` - one namespace, two distributions

## Wiring

- [x] `scripts/check-python.sh`, `scripts/check_mypy_comments.py`, `projects/check-projects.sh`
- [x] `package.json` (`check:python`, added to `check`)
- [x] `.github/workflows/deploy-docs.yml` - setup-python 3.13, pip install tooling, run the check
- [x] `docs/.vitepress/config.ts`, `docs/index.md`, `README.md`, `docs/guide/*`, `.gitignore`

## Verification

- [x] `npm run check` passes end to end (exit 0) with mypy/ruff/pytest/poetry/jupyter on PATH
- [x] Quoted output is from real runs (Poetry 2.4.1, Python 3.13.11, PyInstaller 6.22.3)
- [x] Every `<- mypy:` comment is checked against real mypy output (10/10)
- [x] Built site: all Python-page anchors resolve, all snippet regions exist, `\|` renders
- [x] shellcheck clean on the two new shell scripts
- [ ] Visual check in a browser: not done (no Chrome on this machine)

## Review

17 pages, 19 executed example scripts, 1 notebook, 4 Poetry projects.

**Verified rather than asserted:**

- `check-python.sh` runs every standalone example, `mypy --strict`, ruff and the
  pytest examples, and executes the notebook headless. It fails if a notebook is
  committed with outputs.
- `check_mypy_comments.py` uncomments each `# code  <- mypy: message` line and
  requires mypy to report that message. It caught one paraphrased message.
- `check-projects.sh` syncs slugkit and runs its tests, mypy and ruff. It builds the
  wheel and installs it into a clean venv, then builds a PyInstaller one-file binary
  and runs it under `env -i`. It also runs blog-app through the editable path
  dependency, and installs both acme wheels into one venv to import across the
  namespace.

**Things the real runs contradicted, and the docs now reflect:**

1. Poetry 2.4 writes dev dependencies to PEP 735 `[dependency-groups]`, not
   `[tool.poetry.group.dev.dependencies]`. slugkit was switched over.
2. A path-only dependency bakes `file:///<abs path>` into the wheel's `Requires-Dist`.
   A range in `[project]` plus the path under `[tool.poetry]` does not.
3. PyInstaller's `<3.16` cap makes `poetry lock` fail against `requires-python = ">=3.13"`.
   The fix is a `python_version < '3.16'` marker on the group, not capping the project.
4. Python 3.13's circular-import message shows a "consider renaming" hint for top-level
   modules. The demo uses a package to show the classic "partially initialized module" text.
5. `poetry export` is a plugin in Poetry 2. `poetry lock` no longer upgrades
   (`--regenerate` does). `poetry python install` is experimental.

**Not done / caveats:**

- The GUI executable was built and launched once locally. CI has no display, so it only
  builds and runs the CLI binary. No Windows build was run: the Windows guidance and the
  CI matrix YAML on the standalone page are not executed anywhere.
- Browser rendering (including the mermaid diagram) was built but not viewed.
- CI now installs poetry, mypy, ruff, pytest, nbconvert and ipykernel, and needs network
  access for `poetry sync`. That adds roughly a minute to the deploy workflow.
