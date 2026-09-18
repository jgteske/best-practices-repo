# Managing Dependencies

Dependency management comes down to three questions: *what does my code need*
(`pyproject.toml`), *exactly which versions did we test with* (`poetry.lock`),
and *what is installed right now* (`.venv`). Poetry keeps all three in step.
This page walks through the commands in the order you'll need them, using real
output from a scratch project called `weather-cli`.

## Adding a dependency

```
$ poetry add httpx
Using version ^0.28.1 for httpx

Updating dependencies
Resolving dependencies...

Package operations: 7 installs, 0 updates, 0 removals

  - Installing certifi (2026.7.22)
  - Installing h11 (0.16.0)
  - Installing idna (3.20)
  - Installing typing-extensions (4.16.0)
  - Installing anyio (4.15.1)
  - Installing httpcore (1.0.9)
  - Installing httpx (0.28.1)

Writing lock file
```

One command did three things. It wrote a **range** into `pyproject.toml`,
resolved the full dependency tree (seven packages for one direct dependency) and
recorded it in `poetry.lock`, and installed it into `.venv`:

```toml
[project]
dependencies = [
    "httpx (>=0.28.1,<0.29.0)",
]
```

Import names and distribution names can differ, so check the package's docs.
`pip install pillow` gives you `import PIL`, and `pip install python-dateutil`
gives you `import dateutil`.

## Version constraints

`poetry add` accepts Poetry's shorthand and translates it into standard
[PEP 508](https://peps.python.org/pep-0508/) ranges in `[project]`:

| You type | Written to `pyproject.toml` | Allows |
| --- | --- | --- |
| `poetry add httpx` | `>=0.28.1,<0.29.0` | the latest version, plus compatible updates |
| `poetry add "rich@^13.0"` | `>=13.0,<14.0` | minor and patch updates within 13.x |
| `poetry add "rich@~14.0"` | `>=14.0,<14.1` | patch updates only |
| `poetry add "click@>=8.1,<9"` | `>=8.1,<9` | exactly the range you wrote |
| `poetry add "click==8.1.8"` | `==8.1.8` | one version |
| `poetry add rich@latest` | `>=15.0.0,<16.0.0` | re-targets the range at the newest release |

::: warning `^` below 1.0 is much tighter
For `0.x` versions, the caret treats the *minor* number as breaking, so
`^0.28.1` means `<0.29.0`. By semver convention, anything can change between
`0.28` and `0.29`. Expect to bump `0.x` dependencies by hand.
:::

**Libraries vs applications.** A library you publish should declare the
*widest* range it really works with, because its users need room to resolve it
alongside their other dependencies. An application should keep sensible ranges
too. The lock file, not the range, is what pins its exact versions.

## Dependency groups: dev, test, docs

Tools you need to *develop* the project, but that users of your package never
need, go in a group:

```
$ poetry add --group dev pytest mypy ruff
```

```toml
[dependency-groups]           # PEP 735 - Poetry 2.4 writes groups here
dev = [
    "pytest (>=9.1.1,<10.0.0)",
    "mypy (>=2.3.1,<3.0.0)",
    "ruff (>=0.16.8,<0.17.0)"
]
```

Group dependencies are **never** part of the built package's metadata. They
only affect what gets installed into `.venv`:

```bash
poetry install                  # main + every non-optional group (dev included)
poetry install --without dev    # main dependencies only - e.g. a production image
poetry install --only dev       # just the tools, e.g. a lint-only CI job
poetry install --with docs      # also an optional group
poetry install --all-groups
```

## The lock file

`poetry.lock` records the exact version, source, and **hash of every file** for
every package in the tree:

```toml
[[package]]
name = "httpx"
version = "0.28.1"
description = "The next generation HTTP client."
optional = false
python-versions = ">=3.8"
groups = ["main"]
files = [
    {file = "httpx-0.28.1-py3-none-any.whl", hash = "sha256:d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad"},
    {file = "httpx-0.28.1.tar.gz", hash = "sha256:75e98c5f16b0f35b567856f597f06ff2270a374470a5c2392242528e3e3e42fc"},
]
```

- **Commit it**, for applications *and* libraries. Everyone and every CI run
  gets the same tree. A new release of an indirect dependency can't break your
  build overnight, and the hashes make a tampered download fail to install.
- **Never edit it by hand.** Change `pyproject.toml` (or use `add`/`remove`),
  then let Poetry write the lock.
- The lock is not published with a library. Your users resolve your *ranges*
  against their own lock file.

If `pyproject.toml` and the lock drift apart, for example after a hand edit or a
merge, Poetry refuses to install:

```
$ poetry check --lock
Error: pyproject.toml changed significantly since poetry.lock was last generated. Run `poetry lock` to fix the lock file.
```

```bash
poetry lock                  # re-resolve, keeping the current versions wherever they still fit
poetry lock --regenerate     # re-resolve from scratch (in Poetry 1, `lock` without --no-update did this)
```

## Installing: `install` vs `sync`

| Command | Adds what the lock lists | Removes what the lock doesn't list |
| --- | --- | --- |
| `poetry install` | yes | no |
| `poetry sync` | yes | **yes** |

`sync` makes `.venv` match the lock exactly. Leftover packages from an old
branch, or something you `pip install`ed by hand, are removed:

```
$ poetry sync --without dev
  - Removing pygments (2.21.0)
  - Removing pytest (9.1.1)

Installing the current project: weather-cli (0.1.0)
```

Use `poetry sync` in CI and after switching branches. (`poetry install --sync`
still works, but is deprecated in favour of `sync`.)

## Inspecting the tree

```
$ poetry show --tree
httpx 0.28.1 The next generation HTTP client.
├── anyio *
│   ├── idna >=2.8
│   └── typing-extensions >=4.16.0
├── certifi *
├── httpcore ==1.*
│   ├── certifi *
│   └── h11 >=0.16
└── idna *
pytest 9.1.1 pytest: simple powerful testing with Python
├── colorama >=0.4
├── iniconfig >=1.0.1
├── packaging >=22
├── pluggy >=1.5,<2
└── pygments >=2.7.2
```

`colorama` appears in the tree but was never installed. It's a Windows-only
dependency of pytest, and the lock records the platform marker for it.

"Why is this package here?":

```
$ poetry show --why --tree pygments
pytest 9.1.1 pytest: simple powerful testing with Python
└── pygments >=2.7.2
rich 15.0.0 Render rich text, tables, progress bars, syntax highlighting, markdown and more to the terminal
└── pygments >=2.13.0,<3.0.0
```

## Updating

```
$ poetry show --outdated --top-level
rich 13.9.4 15.0.0 Render rich text, tables, progress bars, syntax highlight...

$ poetry update rich
Resolving dependencies...

No dependencies to install or update

$ poetry add rich@latest
Using version ^15.0.0 for rich
  - Updating rich (13.9.4 -> 15.0.0)
```

`poetry update` only moves *within* the ranges in `pyproject.toml`. The range
was `^13.0`, so 15.0 was out of reach and nothing changed. Crossing a major
version is a deliberate edit: `poetry add pkg@latest`, or change the range and
run `poetry lock`. Read the changelog first.

A routine that works:

1. `poetry show --outdated --top-level` to see what moved.
2. `poetry update` for everything within range, then run the tests.
3. Bump major versions one package at a time, each in its own commit.
4. Or automate the whole thing: Dependabot and Renovate both understand Poetry
   lock files and open one pull request per update.

## Removing

```
$ poetry remove rich
  - Removing mdurl (0.1.2)
  - Removing rich (14.0.0)

Writing lock file
```

Unlike `pip uninstall`, this also removes the indirect dependencies nothing
else needs (here `mdurl`, pulled in by `rich`'s `markdown-it-py`).

## Extras and other sources

```bash
poetry add "httpx[http2]"                                   # a package's optional extras
poetry add git+https://github.com/pallets/click.git#8.2.1   # a git tag, branch or commit
poetry add --editable ../slugkit                            # a local folder
poetry source add --priority=supplemental internal https://pypi.internal.example/simple/
poetry add --source internal acme-billing                   # from a private index
```

Your *own* package can offer extras, which are optional features with their own
dependencies:

```toml
[project.optional-dependencies]
http2 = ["h2 (>=4,<5)"]      # users opt in with: pip install weather-cli[http2]
```

::: warning Path and git dependencies in a published package
A path dependency is great for local development, but the path is baked into
the wheel's metadata unless you also declare the dependency normally in
`[project]`. [Building & Consuming Packages](./building-packages#consuming-a-local-package-from-another-project)
shows the difference with real wheel metadata.
:::

## Exporting `requirements.txt`

Some platforms, like older PaaS builders or a plain `pip install -r`, only
understand `requirements.txt`. In Poetry 2, export is a plugin:

```
$ poetry export --help
The requested command export does not exist.

$ poetry self add poetry-plugin-export
$ poetry export --only main -o requirements.txt      # pinned, with hashes
```

## Checklist

- `poetry add` / `poetry remove`: don't edit dependency lists by hand when
  a command can do it.
- Dev tools go in `--group dev`. Runtime dependencies stay minimal.
- `poetry.lock` is committed, and CI fails if it is stale (`poetry check --lock`).
- `poetry sync` in CI and after switching branches.
- Update within ranges regularly. Cross major versions one package at a time.
- Audit now and then: `pipx run pip-audit` checks the environment for known
  vulnerabilities.
