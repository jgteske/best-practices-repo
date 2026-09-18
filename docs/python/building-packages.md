# Building & Consuming Packages

This page follows one package all the way. `slugkit`, a small library with a
command-line tool, is built into a wheel. A second project, `blog-app`, then
imports it: first as an editable path dependency during development, then from
the built wheel, the way an end user gets it. Both are real Poetry projects
under [`examples/python/projects`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/projects),
and `npm run check:python` builds, installs and runs them on every change.

## The library's `pyproject.toml`

<<< ../../examples/python/projects/slugkit/pyproject.toml#project{toml}

<<< ../../examples/python/projects/slugkit/pyproject.toml#poetry{toml}

<<< ../../examples/python/projects/slugkit/pyproject.toml#build-system{toml}

The fields that matter most:

| Field | Why |
| --- | --- |
| `name` | the distribution name on PyPI: `pip install slugkit` |
| `version` | must be unique per upload. Bump it with `poetry version patch\|minor\|major` |
| `requires-python` | pip refuses to install on older interpreters instead of failing at import time |
| `dependencies` | runtime requirements, as ranges. These end up in the wheel's metadata |
| `license`, `readme`, `classifiers`, `urls` | what PyPI displays. `Typing :: Typed` advertises the type hints |
| `[project.scripts]` | console commands created on install. See [Command-Line Apps](./cli-apps) |
| `packages` | where the code lives (`src/`) and what to include |

### A single source for the version

<<< ../../examples/python/projects/slugkit/src/slugkit/__init__.py#init

`importlib.metadata.version("slugkit")` reads the version of the *installed*
distribution, so `pyproject.toml` stays the only place it's written. Bumping it:

```
$ poetry version minor
Bumping version from 0.1.0 to 0.2.0
```

### `py.typed`

An empty `src/slugkit/py.typed` file tells type checkers that the package ships
its own type hints ([PEP 561](https://peps.python.org/pep-0561/)). Without it,
mypy treats `slugkit` as untyped in every project that installs it, even though
the source is fully annotated.

## Building

```
$ poetry build
Building slugkit (0.3.0)
Building sdist
  - Building sdist
  - Built slugkit-0.3.0.tar.gz
Building wheel
  - Building wheel
  - Built slugkit-0.3.0-py3-none-any.whl
```

That gives two artifacts in `dist/`:

| | Wheel (`.whl`) | Source distribution (`.tar.gz`) |
| --- | --- | --- |
| Is | a zip, ready to unpack into `site-packages` | the source, and pip must build it first |
| Installs | fast, with no build step and no code run | through the build backend, running code |
| Contains | only the package files and metadata | the source tree and `pyproject.toml` |
| pip prefers | **yes**, whenever a compatible one exists | as a fallback |

The wheel filename encodes compatibility: `slugkit-0.3.0-py3-none-any.whl` is
*pure Python* (`py3`), needs no particular ABI (`none`), and runs on any
platform (`any`). Packages with compiled extensions publish one wheel per
platform instead, such as `...-cp313-cp313-manylinux_2_28_x86_64.whl` and
`...-win_amd64.whl`.

### What's inside

A wheel is a zip file, so look before you publish:

```
$ python -m zipfile -l dist/slugkit-0.3.0-py3-none-any.whl
File Name                                             Modified             Size
slugkit/__init__.py                            2016-01-01 00:00:00          289
slugkit/__main__.py                            2016-01-01 00:00:00          140
slugkit/cli.py                                 2016-01-01 00:00:00         1991
slugkit/core.py                                2016-01-01 00:00:00         1157
slugkit/py.typed                               2016-01-01 00:00:00            0
slugkit-0.3.0.dist-info/METADATA               2016-01-01 00:00:00          826
slugkit-0.3.0.dist-info/WHEEL                  2016-01-01 00:00:00           88
slugkit-0.3.0.dist-info/entry_points.txt       2016-01-01 00:00:00           44
slugkit-0.3.0.dist-info/RECORD                 2016-01-01 00:00:00          663
```

```
$ unzip -p dist/slugkit-0.3.0-py3-none-any.whl slugkit-0.3.0.dist-info/METADATA
Metadata-Version: 2.4
Name: slugkit
Version: 0.3.0
Summary: Turn titles into URL slugs, from Python or the command line.
License-Expression: MIT
Keywords: slug,url,cli
Author: Best Practices Repo
Requires-Python: >=3.13
Classifier: Programming Language :: Python :: 3
Classifier: Typing :: Typed
Project-URL: Repository, https://github.com/jgteske/best-practices-repo
Description-Content-Type: text/markdown
...

$ unzip -p dist/slugkit-0.3.0-py3-none-any.whl slugkit-0.3.0.dist-info/entry_points.txt
[console_scripts]
slugkit=slugkit.cli:main
```

The wheel contains no `src/` directory and no `tests/`. The timestamps are
fixed at 2016-01-01 so that building the same source twice produces the same
file.

```
$ tar tzf dist/slugkit-0.3.0.tar.gz
slugkit-0.3.0/README.md
slugkit-0.3.0/pyproject.toml
slugkit-0.3.0/src/slugkit/__init__.py
slugkit-0.3.0/src/slugkit/__main__.py
slugkit-0.3.0/src/slugkit/cli.py
slugkit-0.3.0/src/slugkit/core.py
slugkit-0.3.0/src/slugkit/py.typed
slugkit-0.3.0/PKG-INFO
```

The sdist doesn't contain the tests either. If downstream packagers (Linux
distributions, conda-forge) are meant to run them, add
`include = [{ path = "tests", format = "sdist" }]` under `[tool.poetry]`.

## Consuming a local package from another project

`blog-app` is an application that uses `slugkit`. During development, both
sit side by side in one repository:

<<< ../../examples/python/projects/blog-app/pyproject.toml#project{toml}

<<< ../../examples/python/projects/blog-app/src/blog_app/main.py#main

In `blog-app`, `slugkit` is imported by name, like any other installed
package, with no relative paths and no `sys.path` changes:

```
$ cd blog-app && poetry install && poetry run blog-app
using slugkit 0.3.0 from .../slugkit/src/slugkit/__init__.py
/blog/hello-world/           Hello, World!
/blog/release-notes/         Release Notes
/blog/hello-world-2/         Hello World
```

`slugkit` is imported from `../slugkit/src`, the live source. `develop = true`
makes it an **editable install**, so edits to `slugkit` apply to `blog-app`
immediately, with no reinstall. The mechanism is a one-line `.pth` file in
`blog-app`'s venv, which Python adds to `sys.path` at startup:

```
$ cat .venv/lib/python3.13/site-packages/slugkit.pth
~/github/best-practices-repo/examples/python/projects/slugkit/src
```

The lock file records the source as a relative path, so the lock works on any
machine with the same folder layout:

```toml
[package.source]
type = "directory"
url = "../slugkit"
```

### Why the dependency is declared twice

`[project].dependencies` says *what* `blog-app` needs: `slugkit (>=0.3,<0.4)`.
That goes into `blog-app`'s published metadata. `[tool.poetry.dependencies]`
says *where to get it from during development*. That matters, because if you
write only the path dependency, the path is baked into the wheel:

```
# acme-report built with ONLY  acme-core = { path = "../acme-core" }
Requires-Dist: acme-core @ file:///<absolute path on the build machine>/acme-core

# acme-report built with the [project] range + the path as a dev source
Requires-Dist: acme-core (>=0.1,<0.2)
```

The first wheel can only be installed on the machine that built it. Keep the
real requirement in `[project]`, and use path and git entries under
`[tool.poetry.dependencies]` purely as development sources.

### Installing the built wheel instead

This is what users get: a copy in `site-packages`, not a link to your source
folder.

```
$ pip install ../slugkit/dist/slugkit-0.3.0-py3-none-any.whl
$ blog-app
using slugkit 0.3.0 from .../python3.13/site-packages/slugkit/__init__.py
/blog/hello-world/           Hello, World!
...
```

**Always test the wheel in a clean venv before publishing.** An editable
install imports straight from `src/`, so it can't tell you that a file is
missing from the package. The repository's
[`check-projects.sh`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/projects/check-projects.sh)
does exactly this on every CI run:

```bash
python -m venv /tmp/wheel-test
/tmp/wheel-test/bin/pip install --no-index dist/slugkit-*.whl
/tmp/wheel-test/bin/slugkit slug "Hello, World!"     # hello-world
```

## Every way to depend on your package

| From | `poetry add ...` | Use when |
| --- | --- | --- |
| a sibling folder | `--editable ../slugkit` | a monorepo, or developing both at once |
| a wheel file | `../slugkit/dist/slugkit-0.3.0-py3-none-any.whl` | a one-off hand-over, or an air-gapped machine |
| a git repository | `git+https://github.com/acme/slugkit.git#v0.3.0` | internal code without an index. Pin a tag or commit, never a branch |
| a git subfolder | `git+https://github.com/acme/mono.git#subdirectory=libs/slugkit` | a library inside a monorepo |
| a private index | `--source internal slugkit` (after `poetry source add`) | company-internal packages at scale |
| PyPI | `slugkit` | public, open-source packages |

## Publishing

```bash
# once: TestPyPI as a dry-run target, and an API token for it
poetry config repositories.testpypi https://test.pypi.org/legacy/
poetry config pypi-token.testpypi pypi-XXXXXXXX

poetry build
poetry publish -r testpypi              # try it out
pip install -i https://test.pypi.org/simple/ slugkit

poetry publish                          # the real PyPI
```

- **A version can be uploaded only once.** A broken 0.3.0 is fixed by releasing
  0.3.1, never by re-uploading.
- **Publish from CI, not from a laptop.** PyPI's
  [trusted publishing](https://docs.pypi.org/trusted-publishers/) lets a GitHub
  Actions workflow upload using OIDC, with no long-lived token stored anywhere.
  Build with `poetry build`, then upload `dist/` with
  `pypa/gh-action-pypi-publish`.
- For a private index, `poetry publish -r internal` works the same way.

## Checklist

- `src/` layout, a `py.typed` marker, and a version read through
  `importlib.metadata`.
- Runtime dependencies in `[project].dependencies` as ranges. Path and git
  entries only as dev sources under `[tool.poetry]`.
- Inspect the wheel (`python -m zipfile -l`) and install it into a clean venv
  before every release.
- Bump the version for every release. Publish from CI with trusted publishing.
