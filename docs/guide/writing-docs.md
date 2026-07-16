# Writing New Docs

## Adding a page to an existing section

1. Create a new `.md` file under the relevant folder in `docs/` (e.g.
   `docs/typescript/my-new-topic.md`).
2. Add it to the sidebar in `docs/.vitepress/config.ts`, under the matching
   entry in `themeConfig.sidebar`.
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

<!-- pulls in only lines 10-20 -->
<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts{10-20}

<!-- syntax highlighting can be forced independently of the file extension -->
<<< ../../examples/typescript/event-listeners/typed-event-emitter.ts{ts}
```

The path is relative to the Markdown file doing the importing (VitePress
also supports an `@` alias, but it resolves to `srcDir` - the `docs/`
folder itself - not the repository root, so a relative path is the more
predictable choice here since `examples/` lives outside `docs/`).
Because the source lives in a real `.ts` file included by `tsconfig.json`,
`npm run typecheck` fails the build the moment an example stops compiling -
docs and code cannot silently drift apart the way they can when a snippet is
only ever pasted as inert text inside a fenced code block.
