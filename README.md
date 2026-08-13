# best-practices-repo

A general-purpose documentation repository built with [VitePress](https://vitepress.dev/),
turning plain Markdown files into a static documentation site - the same
role a tool like `pydoc`/Sphinx plays for Python docstrings, but for
hand-written guides.

It currently holds four guides:

- **[TypeScript Best Practice Patterns](docs/typescript)** - modeling with
  types, generics, classes (fields, `this`, abstract classes, `implements`,
  chaining, mixins), runtime patterns, and design patterns built from factory
  functions.
- **[React Best Practices](docs/react)** - components, props, hooks and hook
  chaining, rendering, and events.
- **[JavaScript & Node.js](docs/javascript)** - the language (values, scope,
  objects, iteration, modules, the event loop), the runtime (the CLI, core APIs,
  streams, HTTP, shutdown, and the built-in test runner), and packages
  (publishing, version ranges, and how npm resolves a dependency tree).
- **[Linux, Bash & the Terminal](docs/linux)** - everyday commands, pipes and
  text processing, permissions, processes, services, networking, and shell
  scripting.

Every code sample is backed by a real file under [`examples/`](examples):
TypeScript/TSX examples are `strict`-mode type-checked, shell examples are
parsed with `bash -n` and linted with `shellcheck`, and JavaScript examples are
parsed with `node --check` and then **actually executed** - so the examples in
the docs can never silently drift from code that actually works.

## Quick start

```bash
npm install
npm run docs:dev      # local dev server, http://localhost:5173
npm run docs:build    # build the static site to docs/.vitepress/dist
npm run typecheck     # type-check every TypeScript/TSX example under examples/
npm run check:bash    # bash -n (+ shellcheck, if installed) over examples/bash
npm run check:js      # node --check, then run every JavaScript example + node:test
npm run check         # all of the above, useful as a single CI step
```

## Structure

```
docs/           # published site content (Markdown)
  guide/        # docs about this repo and how to extend it
  typescript/   # TypeScript best practices guide
  react/        # React best practices guide
  javascript/   # JavaScript & Node.js guide
  linux/        # Linux, Bash & terminal guide
examples/       # real, checked source backing the docs' code samples
  typescript/   # compiled with tsc --noEmit
  react/        # compiled with tsc --noEmit (react-jsx)
  javascript/   # parsed with node --check, then executed (incl. node --test)
  bash/         # checked with bash -n and shellcheck
scripts/        # repo tooling (check-bash.sh, check-js.sh)
```

See [`docs/guide`](docs/guide) for how the site is built and how to add new
sections or pages.
