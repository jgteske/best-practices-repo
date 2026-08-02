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
│   ├── guide/                # docs about this repo itself
│   ├── typescript/           # the TypeScript best practices guide
│   ├── react/                # the React best practices guide
│   ├── javascript/           # the JavaScript & Node.js guide
│   └── linux/                # the Linux, Bash & terminal guide
├── examples/                 # real, checked source backing the docs
│   ├── typescript/           # .ts        - type-checked
│   ├── react/                # .tsx       - type-checked
│   ├── javascript/           # .mjs/.cjs  - parsed, then executed
│   └── bash/                 # .sh        - parsed and linted
├── scripts/                  # check-bash.sh, check-js.sh
├── tsconfig.json             # typechecks everything under examples/
└── package.json              # docs:dev / docs:build / typecheck / check:*
```

## Running it locally

```bash
npm install
npm run docs:dev       # local dev server with hot reload
npm run docs:build     # produces docs/.vitepress/dist
npm run typecheck      # type-checks every TypeScript/TSX example
npm run check:bash     # bash -n (+ shellcheck, if installed) over examples/bash
npm run check:js       # node --check, then run every JavaScript example
```

`npm run check` runs the checks and the production build together - useful
as a single CI step to make sure nothing in `examples/` broke and the site
still builds.

Each language gets a verification step appropriate to it: `tsc` for the
TypeScript and React examples, `bash -n` plus `shellcheck` for the shell
examples, and for JavaScript `node --check` followed by **actually running**
each example and the `node:test` suite - which is why the output quoted in the
JavaScript pages is output the code really produced. Adding a new section means
adding its own check the same way - see [Writing new docs](./writing-docs).
