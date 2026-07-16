# best-practices-repo

A general-purpose documentation repository built with [VitePress](https://vitepress.dev/),
turning plain Markdown files into a static documentation site - the same
role a tool like `pydoc`/Sphinx plays for Python docstrings, but for
hand-written guides.

The flagship content right now is an in-depth **TypeScript Best Practice
Patterns** guide under [`docs/typescript`](docs/typescript), with every code
sample backed by a real, `strict`-mode type-checked file under
[`examples/typescript`](examples/typescript) - so the examples in the docs
can never silently drift from code that actually compiles.

## Quick start

```bash
npm install
npm run docs:dev     # local dev server, http://localhost:5173
npm run docs:build    # build the static site to docs/.vitepress/dist
npm run typecheck     # type-check every example under examples/
npm run check         # typecheck + build, useful as a single CI step
```

## Structure

```
docs/           # published site content (Markdown)
  guide/        # docs about this repo and how to extend it
  typescript/   # TypeScript best practices guide
examples/       # real, compiled TypeScript backing the docs' code samples
```

See [`docs/guide`](docs/guide) for how the site is built and how to add new
sections or pages.
