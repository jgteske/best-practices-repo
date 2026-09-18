# Jupyter Notebooks

A notebook (`.ipynb`) mixes code, its output, and prose in one document, and
runs the code one cell at a time against a live Python process, the
**kernel**. That makes notebooks excellent for exploring data, prototyping,
teaching and reports, and poor for code that has to be reused, tested or
deployed. This page covers using them inside a Poetry project, so they run in
the project's environment and can import its code, and keeping them
reproducible and reviewable in git.

The example is a real notebook,
[`examples/python/notebooks/sales_exploration.ipynb`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/notebooks/sales_exploration.ipynb),
with its helpers in a normal module next to it. `npm run check:python` checks
that it was committed without outputs, then executes it top to bottom in a
fresh kernel.

## Setup in a Poetry project

Put Jupyter in its own dependency group, like any other development tool:

```bash
poetry add --group notebook jupyterlab ipykernel   # the browser UI, and the kernel
poetry run jupyter lab                             # opens http://localhost:8888
```

With VS Code, you don't need JupyterLab. `ipykernel` in the project's venv is
enough (`poetry add --group notebook ipykernel`), because VS Code has its own
notebook editor.

For a notebook-only project, a folder of analyses that is never packaged,
set `package-mode = false` under `[tool.poetry]` (see
[Poetry](./poetry-and-virtualenvs#creating-and-inspecting-the-environment)).

## Kernels: which Python is running your cells?

The notebook UI and the kernel are separate processes. The kernel is a Python
interpreter, and **which** interpreter, meaning which venv, decides which
packages the notebook can import. This causes the most common notebook problem:

> "I ran `poetry add pandas`, but the notebook says `ModuleNotFoundError: No module named 'pandas'`."

The notebook is running a different kernel, usually the global Python. Check
from inside the notebook:

```python
import sys
print(sys.executable)   # should be .../your-project/.venv/bin/python
```

**Pick the right kernel:**

- **VS Code:** *Select Kernel* (top right), then *Python Environments*, then the
  project's `.venv`.
- **JupyterLab started with `poetry run jupyter lab`:** the default
  "Python 3" kernel *is* the venv's Python.
- **A Jupyter installed elsewhere** (globally, or a shared JupyterHub): register
  the venv as a named kernel once, and choose it from the kernel menu:

```
$ poetry run python -m ipykernel install --user --name weather-cli --display-name "Python (weather-cli)"
Installed kernelspec weather-cli in ~/.local/share/jupyter/kernels/weather-cli

$ jupyter kernelspec list
Available kernels:
  python3        .../share/jupyter/kernels/python3
  weather-cli    ~/.local/share/jupyter/kernels/weather-cli
```

To install a package *from* a notebook, use `%pip install pkg`, never
`!pip install pkg`. `%pip` targets the running kernel's environment, while
`!pip` runs whichever `pip` is first on the `PATH`. In a Poetry project, prefer
`poetry add` in a terminal, so the dependency is recorded in `pyproject.toml`.

## Keep the code in modules, not in cells

The example notebook doesn't define its logic in cells. It imports it:

<<< ../../examples/python/notebooks/analysis.py#analysis

The notebook itself is short:

```python
# [1]
%load_ext autoreload
%autoreload 2

# [2]
import sys
from analysis import load_sales, monthly_totals, summary
print(sys.executable)  # which environment is this kernel running in?

# [3]
sales = load_sales()
len(sales)
```
```
6
```
```python
# [4]
totals = monthly_totals(sales)
totals
```
```
{'2026-01': 2150.0, '2026-02': 2330.0, '2026-03': 2505.0}
```
```python
# [5]
summary(list(totals.values()))
```
```
{'mean': 2328.3, 'median': 2330.0, 'stdev': 177.5}
```
```python
# [6]
best_month = max(totals, key=totals.__getitem__)
assert best_month == "2026-03"  # a notebook can check its own conclusions
best_month
```
```
'2026-03'
```

(The outputs are from `jupyter nbconvert --execute`.) Code in a module can be
imported by the next notebook, tested with pytest, type-checked, and diffed in
a pull request. Code in cells can't. In a packaged project, the helpers belong
in the package itself (`from weather_cli.analysis import ...`). The notebook then
imports your project the same way `blog-app` imports `slugkit`, because
`poetry install` installed it in editable mode.

**`%autoreload 2`** re-imports changed modules before each cell runs, so an edit
in `analysis.py` shows up in the notebook without restarting the kernel. Without
it, Python's [import cache](./modules-and-imports#import-runs-a-module-once)
keeps serving the old version.

## Hidden state: the notebook trap

Cells can run in any order, and the kernel remembers everything that has ever
run. A notebook can "work" only because of a cell you deleted an hour ago, or
because cell 7 ran before cell 3. The `[n]` numbers show the order cells
*actually* ran in.

- Before trusting a result or committing: **Kernel → Restart & Run All**. If
  that fails, the notebook is broken, whatever the outputs on screen show.
- Keep each cell short and roughly idempotent. Don't mutate a variable that an
  earlier cell created.
- Put imports and parameters in the first cells.
- Automate it. This repository executes every notebook headless in CI, which is
  the same as Restart & Run All.

## Notebooks in git

An `.ipynb` file is JSON. Its outputs (images as base64, tables, tracebacks)
and execution counts change on every run, so diffs become unreadable, merge
conflicts become unresolvable, and outputs can leak data that was never meant
to be committed.

**Commit notebooks without outputs.** [nbstripout](https://github.com/kynan/nbstripout)
does it automatically as a git filter:

```bash
poetry add --group notebook nbstripout
poetry run nbstripout --install      # once per clone: strips outputs on `git add`
```

Your local file keeps its outputs, and only the committed version is clean.
This repository's check fails if a notebook is committed with outputs.

**Or pair it with a script.** [Jupytext](https://jupytext.readthedocs.io/) keeps
a plain `.py` twin of every notebook in sync. You review and diff the `.py`,
and can even skip committing the `.ipynb` at all:

```
$ jupytext --to py:percent sales_exploration.ipynb
[jupytext] Writing sales_exploration.py in format py:percent
```

```python
# %% [markdown]
# ## Setup
#
# `autoreload` re-imports `analysis.py` whenever it changes, so edits there show up without restarting the kernel.

# %%
# %load_ext autoreload
# %autoreload 2

# %%
import sys

from analysis import load_sales, monthly_totals, summary
```

The `# %%` cell markers are understood by VS Code and PyCharm, which can run
the `.py` file cell by cell. `jupytext --set-formats ipynb,py:percent` keeps
both files in sync from then on. For reviewing real `.ipynb` diffs, `nbdime`
adds notebook-aware `git diff` and merge tools.

## Running notebooks headless

```bash
# execute top to bottom in a fresh kernel, and fail on the first error (CI)
jupyter nbconvert --to notebook --execute --stdout report.ipynb > /dev/null

# execute and render a shareable HTML report
jupyter nbconvert --to html --execute report.ipynb

# parametrised runs: same notebook, different inputs
papermill report.ipynb out/2026-03.ipynb -p month 2026-03
```

The first command is what `npm run check:python` runs. For a test suite,
`pytest --nbmake` (from the `nbmake` plugin) runs each notebook as a test.

## Magics worth knowing

| Magic | Does |
| --- | --- |
| `%timeit expr` | benchmarks an expression over many runs |
| `%%time` | times the whole cell once |
| `%debug` | opens the debugger at the last exception |
| `%pip install pkg` | installs into *this kernel's* environment |
| `%load_ext autoreload` + `%autoreload 2` | picks up edits to imported modules |
| `%who` | lists the variables currently defined |
| `!command` | runs a shell command |

## Checklist

- Jupyter and `ipykernel` are in a `notebook` dependency group, and the
  notebook runs on the project's `.venv` kernel (check `sys.executable`).
- Logic lives in importable modules, and cells only call it.
  `%autoreload 2` is on.
- Every notebook survives *Restart & Run All*, and CI executes it headless.
- Outputs are stripped before commit (nbstripout), or notebooks are paired
  with `.py` files (Jupytext).
- When code from a notebook turns out to matter, move it into the package and
  give it tests.
