# About this Repository

This repository is a general-purpose documentation site. It's built with
[VitePress](https://vitepress.dev/), a static site generator that turns a
folder of Markdown files into a fast, searchable documentation website -
the same role a tool like `pydoc`/Sphinx plays for Python, but for
hand-written Markdown guides rather than docstrings extracted from source.

## Why VitePress

- **Markdown-first.** Every page is a `.md` file with normal frontmatter.
  There's no proprietary format to learn.
- **Zero-effort structure.** Sidebar and navigation come from one
  config file (`docs/.vitepress/config.ts`) - adding a page is "add a file,
  add a sidebar entry."
- **Built-in local search, dark mode, and syntax highlighting** with no
  extra setup.
- **Live code imports.** Code blocks can be pulled directly from real
  source files instead of being retyped inline (see
  [Writing new docs](./writing-docs)), so examples are guaranteed to at
  least parse and, where a `tsconfig.json`/typecheck script covers them,
  type-check.

## Repository layout

```
.
├── docs/                     # everything that gets published
│   ├── .vitepress/config.ts  # site nav, sidebar, theme
│   ├── index.md              # home page
│   ├── guide/                 # docs about this repo itself
│   └── typescript/            # the TypeScript best practices guide
├── examples/                 # real, compiled source backing the docs
│   └── typescript/
├── tsconfig.json             # typechecks everything under examples/
└── package.json              # docs:dev / docs:build / typecheck scripts
```

## Running it locally

```bash
npm install
npm run docs:dev       # local dev server with hot reload
npm run docs:build     # produces docs/.vitepress/dist
npm run typecheck      # type-checks every example under examples/
```

`npm run check` runs both the typecheck and the production build - useful
as a single CI step to make sure nothing in `examples/` broke and the site
still builds.
