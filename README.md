# best-practices-repo

A general-purpose documentation repository built with [VitePress](https://vitepress.dev/),
turning plain Markdown files into a static documentation site - the same
role a tool like `pydoc`/Sphinx plays for Python docstrings, but for
hand-written guides.

It currently holds four guides:

- **JavaScript & TypeScript** - one section, grouped by topic, made up of:
  - **[JavaScript & Node.js](docs/javascript)** - the language (values, scope,
    objects, iteration, modules, the event loop), the runtime (the CLI, core
    APIs, streams, HTTP, shutdown, and the built-in test runner), and packages
    (publishing, version ranges, and how npm resolves a dependency tree).
  - **[TypeScript Best Practice Patterns](docs/typescript)** - modeling with
    types, generics, classes (fields, `this`, abstract classes, `implements`,
    chaining, mixins), runtime patterns, design patterns built from factory
    functions, schema validation with zod, and what each `tsconfig` strictness
    flag catches.
  - **[React Best Practices](docs/react)** - components, props, hooks and hook
    chaining, reducers, data fetching, forms, rendering, error boundaries,
    events, and component testing.
- **[Python](docs/python)** - the language (values, typing, classes, errors,
  generators), projects (Poetry, virtual environments, dependencies, modules and
  namespace packages), packaging (building wheels, consuming them from another
  project, CLIs, standalone executables), and workflow (pytest, ruff, mypy,
  Jupyter notebooks).
- **[Linux, Bash & the Terminal](docs/linux)** - everyday commands, pipes and
  text processing, permissions, processes, services, networking, and shell
  scripting.
- **[Git & Collaboration](docs/git)** - the data model (snapshots, branches as
  pointers, the index), the everyday workflow, merging and rebasing, undoing
  mistakes and the reflog, remotes and pull requests, and repository setup
  (`.gitignore`, `.gitattributes`, hooks).

Every code sample is backed by a real file under [`examples/`](examples):
TypeScript/TSX examples are `strict`-mode type-checked, the React examples'
component tests are run with Vitest, shell examples are
parsed with `bash -n` and linted with `shellcheck` (and the Git examples are
run, in throwaway repositories), and JavaScript examples are
parsed with `node --check` and then **actually executed**, and Python examples
are executed, type-checked with `mypy --strict`, linted with ruff, and the real
Poetry projects are built and installed - so the examples in the docs can never
silently drift from code that actually works.

## Quick start

```bash
npm install
npm run docs:dev      # local dev server, http://localhost:5173
npm run docs:build    # build the static site to docs/.vitepress/dist
npm run typecheck     # type-check every TypeScript/TSX example under examples/
npm run check:react   # run the React component tests (Vitest + Testing Library, jsdom)
npm run check:bash    # bash -n (+ shellcheck, if installed) over examples/bash
npm run check:js      # node --check, then run every JavaScript example + node:test
npm run check:python  # run every Python example; + mypy/ruff/pytest/poetry when installed
npm run check         # all of the above, useful as a single CI step
```

## Structure

```
docs/           # published site content (Markdown)
  guide/        # docs about this repo and how to extend it
  javascript/   # JavaScript & TypeScript section: JavaScript & Node.js pages
  typescript/   #   ... TypeScript pages
  react/        #   ... React pages
  python/       # Python guide
  linux/        # Linux, Bash & terminal guide
  git/          # Git & collaboration guide
examples/       # real, checked source backing the docs' code samples
  typescript/   # compiled with tsc --noEmit
  react/        # compiled with tsc --noEmit (react-jsx); *.test.tsx run by Vitest
  javascript/   # parsed with node --check, then executed (incl. node --test)
  python/       # executed, mypy --strict, ruff, pytest; Poetry projects built
  bash/         # checked with bash -n and shellcheck; git/ scripts are also run
scripts/        # repo tooling (check-bash.sh, check-js.sh, check-python.sh)
```

See [`docs/guide`](docs/guide) for how the site is built and how to add new
sections or pages.
