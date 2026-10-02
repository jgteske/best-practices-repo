# Writing New Docs

## Adding a page to an existing section

1. Create a new `.md` file under the relevant folder in `docs/` (e.g.
   `docs/typescript/my-new-topic.md`).
2. Add it to the sidebar in `docs/.vitepress/config.ts`, under the matching
   entry in `themeConfig.sidebar`. JavaScript, TypeScript and React pages
   all go in the shared `jsTsSidebar`, under the topic group they belong
   to (classes, errors, async, ...), not under their language.
3. Run `npm run docs:dev` and check it renders as expected.

## Adding a whole new top-level section

This repository is meant to grow beyond TypeScript. To start a new
best-practices guide for another topic:

1. Create a new folder under `docs/`, e.g. `docs/python/`, with its own
   `index.md` overview page.
2. Add a top-level `nav` entry and a `sidebar` entry (keyed by the folder's
   path, e.g. `"/python/"`) in `docs/.vitepress/config.ts`.
3. If the new section has runnable code examples, add a matching folder
   under `examples/` (e.g. `examples/python/`) and wire up whatever
   type-checker/linter/test runner is appropriate for that language as an
   npm script, the same way `npm run typecheck` covers `examples/typescript`.

## Keeping code samples honest

Don't paste code directly into a fenced code block if it's meant to be a
working example - paste it into a real file under `examples/` and import it
into the Markdown instead, using VitePress's snippet-import syntax:

```md
<!-- pulls in the whole file -->
<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts

<!-- syntax highlighting can be forced independently of the file extension -->
<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts{ts}

<!-- pulls in only the marked region (see below) -->
<<< ../../examples/javascript/packages/semver.mjs#bounds{js}

<!-- the whole file, with lines 10-20 highlighted -->
<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts{10-20}
```

::: warning `{10-20}` highlights, it does not select
A line range after a snippet import still embeds the **entire** file and merely
highlights those lines. To quote part of a file, mark a region in the source and
import that instead:

```js
// #region bounds
function caretUpperBound(part) { /* … */ }
// #endregion bounds
```

The markers are stripped from the rendered snippet and the result is dedented,
so a region taken from inside a function body reads as top-level code.
:::

The path is relative to the Markdown file doing the importing (VitePress
also supports an `@` alias, but it resolves to `srcDir` - the `docs/`
folder itself - not the repository root, so a relative path is the more
predictable choice here since `examples/` lives outside `docs/`).
Because the source lives in a real `.ts` file included by `tsconfig.json`,
`npm run typecheck` fails the build the moment an example stops compiling -
docs and code cannot silently drift apart the way they can when a snippet is
only ever pasted as inert text inside a fenced code block.

## One checker per language

Each `examples/` subtree gets a verification step suited to its language, wired
up as an npm script and included in `npm run check`:

| Examples | Checked by | Script |
| --- | --- | --- |
| `examples/typescript`, `examples/react` | `tsc --noEmit` against `tsconfig.json` | `npm run typecheck` |
| `examples/bash` | `bash -n` on every `.sh`, plus `shellcheck` when it is installed | `npm run check:bash` |
| `examples/javascript` | `node --check` on every `.mjs`/`.cjs`, then **executes** each runnable file, then `node --test` | `npm run check:js` |
| `examples/python` | compiles and **executes** every standalone `.py`; when installed: `mypy --strict` (plus every quoted `<- mypy:` error), ruff, pytest, notebook execution, and building/installing the Poetry projects | `npm run check:python` |

`scripts/check-bash.sh` is the pattern to copy for a new language: find the
example files, run the strictest checker that is guaranteed to be available,
and optionally run a better one if the machine has it. Keep the mandatory check
dependency-free so a fresh `npm install` is enough to run `npm run check`.

`scripts/check-js.sh` goes one step further and runs the examples, which is what
lets the JavaScript pages quote real program output. Every example is written to
terminate on its own; one that legitimately cannot be run unattended opts out
with a `// check-js: no-run` marker comment, which is visible in the rendered
snippet so the exemption documents itself.

Fenced code blocks are still the right choice for two things: an
**anti-pattern** (deliberately broken code that must not be checked), and
**illustrative one-liners** that are not a complete, runnable file - the
command tables throughout the Linux guide, for example.
